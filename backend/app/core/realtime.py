"""Generic realtime fan-out bus (used by support tickets and account events).

A thin in-process registry of WebSocket connections (``ConnectionManager``)
sits behind a Redis pub/sub bridge. Services ``publish()`` an event to a Redis
channel; a per-process listener task receives it and delivers it to the local
WebSockets subscribed to that topic. Going through Redis means an event raised
in one worker reaches clients connected to any worker.

Topics are plain strings:
  * ``ticket:{uuid}``  — the thread of a single ticket (its owner + viewing admin)
  * ``admin``          — the global admin feed (new tickets, status changes)
  * ``user:{uuid}``    — a single user's support feed (across all their tickets)
  * ``account:{uuid}`` — a single user's account feed (e.g. RBAC permission changes)
  * ``notifications:{uuid}`` — a single user's persistent in-app notification feed

The Redis channel is the topic prefixed with ``rt:``.

A gated socket can run a watch alongside it: ``watch_socket`` re-asks a check
supplied by the caller and closes the socket on a refusal. What is being checked
is not this module's business.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager, suppress

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from starlette.websockets import WebSocketState

from app.core.redis import get_redis
from app.schemas.support import RealtimeEvent

logger = logging.getLogger(__name__)

_CHANNEL_PREFIX = "rt:"
_CHANNEL_PATTERN = f"{_CHANNEL_PREFIX}*"
# Close code of a socket that lost its right to stay open (RFC 6455). Clients
# treat it as final and do not reconnect.
_WS_POLICY_VIOLATION = 1008
# Close code of a socket whose right could not be checked (RFC 6455 registry).
# Clients reconnect on it, and the handshake gate then decides again.
_WS_TRY_AGAIN_LATER = 1013


class ConnectionManager:
    """In-process map of topic -> set of live WebSocket connections."""

    def __init__(self) -> None:
        """Initialise an empty topic registry guarded by an async lock."""
        self._topics: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, topic: str, websocket: WebSocket) -> None:
        """Register an already-accepted WebSocket under a topic."""
        async with self._lock:
            self._topics.setdefault(topic, set()).add(websocket)

    async def disconnect(self, topic: str, websocket: WebSocket) -> None:
        """Remove a WebSocket from a topic, dropping the topic when empty."""
        async with self._lock:
            connections = self._topics.get(topic)
            if connections is None:
                return
            connections.discard(websocket)
            if not connections:
                self._topics.pop(topic, None)

    async def disconnect_all(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from every topic it joined (on socket close).

        A multiplexed socket may sit on several topics (its feed plus a ticket
        thread), so cleanup must sweep them all.
        """
        async with self._lock:
            for topic in list(self._topics.keys()):
                connections = self._topics[topic]
                connections.discard(websocket)
                if not connections:
                    self._topics.pop(topic, None)

    async def broadcast_local(self, topic: str, data: str) -> None:
        """Send a raw text frame to every local WebSocket on ``topic``.

        Iterates a snapshot so a send-triggered disconnect can't mutate the set
        mid-loop. Failed sockets are pruned rather than aborting the broadcast.
        """
        async with self._lock:
            connections = list(self._topics.get(topic, ()))
        if not connections:
            return

        dead: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_text(data)
            except Exception:  # noqa: BLE001 - a broken socket must not stop fan-out
                dead.append(websocket)

        for websocket in dead:
            await self.disconnect(topic, websocket)


manager = ConnectionManager()

_listener_task: asyncio.Task[None] | None = None


async def publish(topic: str, event: BaseModel) -> None:
    """Publish an event to all subscribers of ``topic`` across processes."""
    await get_redis().publish(f"{_CHANNEL_PREFIX}{topic}", event.model_dump_json())


async def publish_safe(topic: str, event: BaseModel) -> None:
    """Publish without letting a realtime failure break the caller's request."""
    try:
        await publish(topic, event)
    except Exception:  # noqa: BLE001 - realtime is best-effort, never fatal
        logger.exception("Failed to publish realtime event to topic %s", topic)


ADMIN_TOPIC = "admin"


def user_topic(user_id: uuid.UUID) -> str:
    """Realtime topic carrying changes across all of a single user's tickets."""
    return f"user:{user_id}"


def account_topic(user_id: uuid.UUID) -> str:
    """Realtime topic carrying account-level changes for a single user."""
    return f"account:{user_id}"


def notifications_topic(user_id: uuid.UUID) -> str:
    """Realtime topic carrying a single user's in-app notifications."""
    return f"notifications:{user_id}"


async def publish_feeds(owner_id: uuid.UUID, event: RealtimeEvent) -> None:
    """Fan a ticket-summary event out to both the admin queue and its owner's feed.

    Used wherever a ticket changes so the admin queue and the owner's list both
    refresh live, regardless of which side triggered the change.
    """
    await publish_safe(ADMIN_TOPIC, event)
    await publish_safe(user_topic(owner_id), event)


# --- Socket watch -------------------------------------------------------------

# Answers whether a socket may stay open: the seconds this answer holds, or None
# once it may not. Raising means the answer could not be obtained.
SocketCheck = Callable[[], Awaitable[float | None]]
# Starts a socket's watch once it is accepted; the task is cancelled when it ends.
SocketWatcher = Callable[[WebSocket], "asyncio.Task[None]"]


class _WakeOnFrame:
    """Topic subscriber that only remembers that a frame arrived."""

    def __init__(self) -> None:
        """Start with no frame pending."""
        self._arrived = asyncio.Event()

    async def send_text(self, _data: str) -> None:
        """Note the frame; its content does not matter, only the re-check does."""
        self._arrived.set()

    async def wait(self) -> None:
        """Wait for a frame, folding those that arrive together into one wake-up."""
        await self._arrived.wait()
        self._arrived.clear()


async def _wait_for_refusal(signal: _WakeOnFrame, check: SocketCheck) -> int:
    """Re-ask ``check`` on each signal or delay until it refuses; return the code.

    The wait is bounded so the outcome never rests on an event being delivered.
    """
    while True:
        try:
            holds_for = await check()
        except Exception:  # noqa: BLE001 - an unanswered check must not leave it open
            logger.exception("Socket check failed")
            return _WS_TRY_AGAIN_LATER
        if holds_for is None:
            return _WS_POLICY_VIOLATION
        with suppress(TimeoutError):
            await asyncio.wait_for(signal.wait(), holds_for)


async def watch_socket(websocket: WebSocket, *, topic: str, check: SocketCheck) -> None:
    """Close an accepted socket when ``check`` stops allowing it.

    Any frame on ``topic`` triggers a new check, and so does the end of the delay
    the last check returned. The first check runs after the subscription, so a
    change published just before this point is not missed.
    """
    signal = _WakeOnFrame()
    await manager.connect(topic, signal)
    try:
        code = await _wait_for_refusal(signal, check)
    finally:
        await manager.disconnect(topic, signal)
    await manager.disconnect_all(websocket)
    # The client may have left in the meantime: nothing is left to close then.
    with suppress(RuntimeError, WebSocketDisconnect):
        await websocket.close(code=code)


# --- Multiplexed WebSocket serving -----------------------------------------

_TICKET_TOPIC_PREFIX = "ticket:"

# An authorize callback decides whether the caller may join a ticket thread.
AuthorizeTicket = Callable[[uuid.UUID], Awaitable[bool]]


def _parse_ticket_topic(topic: str) -> uuid.UUID | None:
    """Return the ticket UUID for a ``ticket:{uuid}`` topic, else ``None``."""
    if not topic.startswith(_TICKET_TOPIC_PREFIX):
        return None
    try:
        return uuid.UUID(topic[len(_TICKET_TOPIC_PREFIX) :])
    except ValueError:
        return None


async def _handle_command(
    websocket: WebSocket, raw: str, authorize_ticket: AuthorizeTicket
) -> None:
    """Apply one client ``subscribe``/``unsubscribe`` frame to a ticket topic.

    Only ``ticket:{uuid}`` topics are client-controllable, and a subscribe is
    gated by ``authorize_ticket``; anything else is ignored.
    """
    try:
        message = json.loads(raw)
    except (ValueError, TypeError):
        return
    if not isinstance(message, dict):
        return
    action = message.get("action")
    topic = message.get("topic")
    if action not in ("subscribe", "unsubscribe") or not isinstance(topic, str):
        return
    ticket_id = _parse_ticket_topic(topic)
    if ticket_id is None:
        return
    if action == "subscribe":
        if await authorize_ticket(ticket_id):
            await manager.connect(topic, websocket)
    else:
        await manager.disconnect(topic, websocket)


@asynccontextmanager
async def _serving(
    websocket: WebSocket, topic: str, watcher: SocketWatcher | None
) -> AsyncIterator[None]:
    """Hold a socket open on ``topic``, with its optional watch, until it closes."""
    await websocket.accept()
    await manager.connect(topic, websocket)
    watch = watcher(websocket) if watcher is not None else None
    try:
        yield
    except WebSocketDisconnect:
        pass
    except RuntimeError:
        # Starlette refuses a read once the watch has closed the socket, which
        # happens when a frame was being handled at that moment.
        if websocket.application_state != WebSocketState.DISCONNECTED:
            raise
    finally:
        if watch is not None:
            watch.cancel()
            await asyncio.gather(watch, return_exceptions=True)
        await manager.disconnect_all(websocket)


async def serve_multiplex(
    websocket: WebSocket,
    *,
    feed_topic: str,
    authorize_ticket: AuthorizeTicket,
    watcher: SocketWatcher | None = None,
) -> None:
    """Run a multiplexed support socket: one feed topic plus on-demand tickets.

    The socket is auto-subscribed to ``feed_topic`` (the caller's user or admin
    feed). The client may then send ``{"action": "subscribe"|"unsubscribe",
    "topic": "ticket:<uuid>"}`` frames to follow a single ticket thread, gated by
    ``authorize_ticket``. Every joined topic is dropped when the socket closes.
    The socket must already be authenticated; it is accepted here.
    ``watcher``, if given, runs for as long as the socket does.
    """
    async with _serving(websocket, feed_topic, watcher):
        while True:
            raw = await websocket.receive_text()
            await _handle_command(websocket, raw, authorize_ticket)


async def serve_account_socket(
    websocket: WebSocket,
    *,
    topic: str,
    watcher: SocketWatcher | None = None,
) -> None:
    """Run a notification-only socket subscribed to a single ``topic``.

    The client sends nothing; the loop only awaits ``receive_text`` so a close
    is detected and the socket is unsubscribed. The socket must already be
    authenticated; it is accepted here. ``watcher``, if given, runs for as long
    as the socket does.
    """
    async with _serving(websocket, topic, watcher):
        while True:
            await websocket.receive_text()


async def _listen() -> None:
    """Bridge Redis pub/sub messages to local WebSocket connections."""
    pubsub = get_redis().pubsub()
    await pubsub.psubscribe(_CHANNEL_PATTERN)
    try:
        async for raw in pubsub.listen():
            if raw.get("type") != "pmessage":
                continue
            channel = raw["channel"]
            topic = channel[len(_CHANNEL_PREFIX) :]
            await manager.broadcast_local(topic, raw["data"])
    except asyncio.CancelledError:
        raise
    except Exception:  # noqa: BLE001 - listener must survive transient errors
        logger.exception("Support realtime listener crashed")
    finally:
        await pubsub.punsubscribe(_CHANNEL_PATTERN)
        await pubsub.aclose()


async def start_realtime() -> None:
    """Start the background Redis -> WebSocket listener task."""
    global _listener_task
    if _listener_task is None:
        _listener_task = asyncio.create_task(_listen())


async def stop_realtime() -> None:
    """Cancel the listener task and wait for it to unwind."""
    global _listener_task
    if _listener_task is not None:
        _listener_task.cancel()
        try:
            await _listener_task
        except asyncio.CancelledError:
            pass
        _listener_task = None
