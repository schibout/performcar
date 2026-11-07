"""User-facing routes and sockets are gated by ``self.*`` keys, the socle is not.

The sockets run through the real ASGI app in the test's event loop, so the
handshake, the Starlette state machine and the Redis bridge are all the
production ones.
"""

import asyncio
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from fastapi import WebSocket
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select, update
from sqlalchemy.exc import SQLAlchemyError
from starlette.websockets import WebSocketState

from app.api.deps import require_user_permission
from app.core import realtime
from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.core.realtime import (
    account_topic,
    notifications_topic,
    publish_safe,
    serve_account_socket,
    user_topic,
    watch_socket,
)
from app.core.security import create_access_token
from app.main import app
from app.models.admin_permission import AdminPermission
from app.models.rbac import (
    RbacPermissionSet,
    RbacPermissionSetItem,
    RbacRole,
    RbacUserPermissionSet,
    RbacUserRole,
)
from app.models.user import User
from app.repositories.user import create_user
from app.schemas.account import AccountEvent, AccountEventType
from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.rbac import RbacAudience
from app.schemas.user import SystemRole
from app.tests.admin.conftest import (
    grant_permissions,
    login,
    promote_to_admin,
    promote_to_superadmin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal
from app.tests.notifications.conftest import get_user_id, seed_notification
from app.tests.support.conftest import PNG_BYTES, open_ticket
from app.use_cases import socket_permissions
from app.use_cases.permissions import (
    get_effective_permissions,
    invalidate_user_permissions,
)
from app.use_cases.socket_permissions import close_on_permission_loss
from app.utils import utc_now

POLICY_VIOLATION = 1008
TRY_AGAIN_LATER = 1013
SELF_PERMISSIONS = {key for key in Permission if is_self_permission(key)}
PNG_UPLOAD = {"files": {"file": ("a.png", PNG_BYTES, "image/png")}}

GATED_ROUTES = [
    (
        "PATCH",
        "/users/me",
        Permission.SELF_PROFILE_UPDATE,
        200,
        {"json": {"first_name": "New"}},
    ),
    ("POST", "/upload", Permission.SELF_FILES_UPLOAD, 201, PNG_UPLOAD),
    ("GET", "/notifications", Permission.SELF_NOTIFICATIONS_READ, 200, {}),
    (
        "GET",
        "/notifications/unread-count",
        Permission.SELF_NOTIFICATIONS_READ,
        200,
        {},
    ),
    ("POST", "/notifications/read-all", Permission.SELF_NOTIFICATIONS_READ, 200, {}),
    (
        "POST",
        "/notifications/{notification_id}/read",
        Permission.SELF_NOTIFICATIONS_READ,
        200,
        {},
    ),
    ("GET", "/support/tickets", Permission.SELF_SUPPORT_READ, 200, {}),
    ("GET", "/support/tickets/{ticket_id}", Permission.SELF_SUPPORT_READ, 200, {}),
    (
        "POST",
        "/support/tickets",
        Permission.SELF_SUPPORT_CREATE,
        201,
        {"json": {"subject": "Help", "body": "Broken"}},
    ),
    (
        "POST",
        "/support/tickets/{ticket_id}/messages",
        Permission.SELF_SUPPORT_REPLY,
        201,
        {"json": {"body": "More"}},
    ),
    (
        "POST",
        "/support/tickets/{ticket_id}/close",
        Permission.SELF_SUPPORT_CLOSE,
        200,
        {},
    ),
]
ROUTE_IDS = [f"{method} {path}" for method, path, *_ in GATED_ROUTES]
ROUTES_WITH_STATUS = [
    (method, path, expected, kwargs)
    for method, path, _permission, expected, kwargs in GATED_ROUTES
]

GATED_SOCKETS = [
    ("/notifications/ws", Permission.SELF_NOTIFICATIONS_READ, notifications_topic),
    ("/support/ws", Permission.SELF_SUPPORT_READ, user_topic),
]
SOCKET_IDS = [path for path, *_ in GATED_SOCKETS]


async def _hold_only(user_id: uuid.UUID, permissions: set[Permission]) -> None:
    """Leave the account holding exactly ``permissions``, through a direct set."""
    async with TestingSessionLocal() as session:
        await session.execute(
            delete(RbacUserRole).where(RbacUserRole.user_id == user_id)
        )
        if permissions:
            bundle = RbacPermissionSet(
                key=f"test.{uuid.uuid4().hex}",
                name="Test bundle",
                audience=RbacAudience.USER.value,
            )
            session.add(bundle)
            await session.flush()
            session.add_all(
                RbacPermissionSetItem(set_id=bundle.id, permission=key.value)
                for key in permissions
            )
            session.add(RbacUserPermissionSet(user_id=user_id, set_id=bundle.id))
        await session.commit()
    await invalidate_user_permissions(user_id)


async def _assign_only_role(user_id: uuid.UUID, key: str) -> None:
    """Replace the account's roles with one catalog role."""
    async with TestingSessionLocal() as session:
        await session.execute(
            delete(RbacUserRole).where(RbacUserRole.user_id == user_id)
        )
        stmt = select(RbacRole.id).where(RbacRole.key == key)
        role_id = (await session.execute(stmt)).scalar_one()
        session.add(RbacUserRole(user_id=user_id, role_id=role_id))
        await session.commit()
    await invalidate_user_permissions(user_id)


async def _seed_account(role: SystemRole = SystemRole.USER) -> User:
    """Create an active account the way production does, with its default role."""
    async with TestingSessionLocal() as session:
        return await create_user(
            session,
            User(
                email=f"{uuid.uuid4().hex}@test.com",
                hashed_password="x",
                role=role.value,
                is_active=True,
                is_verified=True,
            ),
        )


async def _settle() -> None:
    """Let the socket's background watcher reach its idle wait."""
    await asyncio.sleep(0.05)


class AsgiSocket:
    """A WebSocket client driving the real ASGI app in the current event loop."""

    def __init__(self, path: str, user_id: uuid.UUID) -> None:
        """Prepare the handshake scope, authenticated by a real access cookie."""
        cookie = f"access_token={create_access_token(user_id)}"
        full_path = f"{settings.API_V1_STR}{path}"
        self._scope = {
            "type": "websocket",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "scheme": "ws",
            "path": full_path,
            "raw_path": full_path.encode(),
            "root_path": "",
            "query_string": b"",
            "headers": [(b"host", b"test"), (b"cookie", cookie.encode())],
            "client": ("testclient", 1),
            "server": ("test", 80),
            "subprotocols": [],
            "state": {},
        }
        self._incoming: asyncio.Queue[dict] = asyncio.Queue()
        self._outgoing: asyncio.Queue[dict] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None

    async def handshake(self) -> dict:
        """Start the route and return the server's answer to the upgrade."""
        await self._incoming.put({"type": "websocket.connect"})
        self._task = asyncio.create_task(
            app(self._scope, self._incoming.get, self._outgoing.put)
        )
        return await self.next_message()

    async def next_message(self) -> dict:
        """Return the next ASGI message the server sent."""
        return await asyncio.wait_for(self._outgoing.get(), timeout=3)

    def has_no_message(self) -> bool:
        """Return whether the server has nothing pending for this client."""
        return self._outgoing.empty()

    async def send_text(self, text: str) -> None:
        """Deliver a text frame to the route."""
        await self._incoming.put({"type": "websocket.receive", "text": text})

    async def leave(self) -> None:
        """Disconnect and wait for the route to unwind, re-raising its errors."""
        await self._incoming.put({"type": "websocket.disconnect", "code": 1000})
        if self._task is not None:
            await asyncio.wait_for(self._task, timeout=3)


class StubSocket:
    """Records the close and the frames of an already-accepted socket."""

    def __init__(self) -> None:
        """Start open with no captured frame."""
        self.closed_with: int | None = None
        self.frames: list[str] = []

    async def send_text(self, data: str) -> None:
        """Record an outbound text frame."""
        self.frames.append(data)

    async def close(self, code: int = 1000) -> None:
        """Record the close code."""
        self.closed_with = code


@pytest.fixture(autouse=True)
def watcher_uses_test_database(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point the socket watcher's own sessions at the test database."""
    monkeypatch.setattr(socket_permissions, "AsyncSessionLocal", TestingSessionLocal)


@pytest_asyncio.fixture
async def live_bus() -> AsyncIterator[None]:
    """Run the Redis to socket bridge for the duration of the test."""
    await realtime.start_realtime()
    await asyncio.sleep(0.1)
    try:
        yield
    finally:
        await realtime.stop_realtime()


@pytest_asyncio.fixture
async def member(client: AsyncClient) -> SimpleNamespace:
    """A logged-in account with the default role, one ticket, one notification."""
    await register_and_verify(client, "member@test.com")
    await login(client, "member@test.com")
    user_id = await get_user_id(client)
    ticket = await open_ticket(client)
    notification = await seed_notification(user_id)
    return SimpleNamespace(
        client=client,
        user_id=user_id,
        ticket_id=ticket["id"],
        notification_id=notification.id,
    )


@pytest_asyncio.fixture
async def other() -> AsyncIterator[AsyncClient]:
    """A second logged-in account with the default role, on its own cookie jar."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url=f"http://test{settings.API_V1_STR}"
    ) as ac:
        await register_and_verify(ac, "other@test.com")
        await login(ac, "other@test.com")
        yield ac


async def _publish_permissions_updated(user_id: uuid.UUID) -> None:
    """Publish the account event a real permission change raises."""
    await publish_safe(
        account_topic(user_id),
        AccountEvent(type=AccountEventType.PERMISSIONS_UPDATED),
    )


# --- Factory guard ----------------------------------------------------------


@pytest.mark.parametrize(
    "permission", [key for key in Permission if not is_self_permission(key)]
)
def test_user_factory_refuses_admin_keys_at_definition(permission: Permission):
    """The factory skips the admin gate, so it must never carry an admin key."""
    with pytest.raises(ValueError, match="self"):
        require_user_permission(permission)


@pytest.mark.parametrize("permission", sorted(SELF_PERMISSIONS))
def test_user_factory_accepts_self_keys(permission: Permission):
    """Every ``self.*`` key builds a dependency."""
    assert require_user_permission(permission).__rbac_permission__ == permission


# --- HTTP routes ------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path", "expected", "kwargs"), ROUTES_WITH_STATUS, ids=ROUTE_IDS
)
async def test_default_role_reaches_every_gated_route(
    member: SimpleNamespace,
    method: str,
    path: str,
    expected: int,
    kwargs: dict,
):
    """An account with the default ``user`` role passes each route's gate."""
    url = path.format(
        ticket_id=member.ticket_id, notification_id=member.notification_id
    )
    response = await member.client.request(method, url, **kwargs)
    assert response.status_code == expected, response.text


@pytest.mark.parametrize(
    ("method", "path", "permission", "expected", "kwargs"), GATED_ROUTES, ids=ROUTE_IDS
)
async def test_each_route_demands_its_own_key(
    member: SimpleNamespace,
    method: str,
    path: str,
    permission: Permission,
    expected: int,
    kwargs: dict,
):
    """Holding every ``self.*`` key but the route's own one is not enough."""
    await _hold_only(member.user_id, SELF_PERMISSIONS - {permission})
    url = path.format(
        ticket_id=member.ticket_id, notification_id=member.notification_id
    )
    refused = await member.client.request(method, url, **kwargs)
    assert refused.status_code == 403, refused.text

    await _hold_only(member.user_id, {permission})
    allowed = await member.client.request(method, url, **kwargs)
    assert allowed.status_code == expected, allowed.text


async def test_restricted_role_reads_tickets_but_cannot_create(
    member: SimpleNamespace,
):
    """``user_restricted`` is read-only on support and notifications."""
    await _assign_only_role(member.user_id, "user_restricted")
    client = member.client

    assert (await client.get("/support/tickets")).status_code == 200
    detail = await client.get(f"/support/tickets/{member.ticket_id}")
    assert detail.status_code == 200
    assert (await client.get("/notifications")).status_code == 200

    created = await client.post(
        "/support/tickets", json={"subject": "Help", "body": "Broken"}
    )
    assert created.status_code == 403
    replied = await client.post(
        f"/support/tickets/{member.ticket_id}/messages", json={"body": "More"}
    )
    assert replied.status_code == 403
    closed = await client.post(f"/support/tickets/{member.ticket_id}/close")
    assert closed.status_code == 403
    assert (
        await client.patch("/users/me", json={"first_name": "X"})
    ).status_code == 403
    assert (await client.post("/upload", **PNG_UPLOAD)).status_code == 403


@pytest.mark.parametrize(
    ("method", "path", "kwargs"),
    [
        ("GET", "/users/me", {}),
        ("GET", "/users/me/sessions", {}),
        ("DELETE", "/users/me/sessions", {}),
        ("GET", "/settings/public", {}),
        ("GET", "/announcements/active", {}),
        ("POST", "/auth/logout", {}),
    ],
    ids=lambda value: value if isinstance(value, str) else "",
)
async def test_socle_stays_open_to_an_account_without_any_role(
    member: SimpleNamespace, method: str, path: str, kwargs: dict
):
    """The base routes never depend on RBAC."""
    await _hold_only(member.user_id, set())
    response = await member.client.request(method, path, **kwargs)
    assert response.status_code == 200, response.text


async def test_account_without_any_role_can_delete_and_reactivate(
    member: SimpleNamespace,
):
    """Leaving and coming back stays possible with no permission at all."""
    await _hold_only(member.user_id, set())
    deleted = await member.client.request(
        "DELETE", "/users/me", json={"password": "Password123!"}
    )
    assert deleted.status_code == 200, deleted.text

    await login(member.client, "member@test.com")
    reactivated = await member.client.post("/users/me/reactivate")
    assert reactivated.status_code == 200, reactivated.text


async def test_user_never_sees_another_users_ticket(
    member: SimpleNamespace, other: AsyncClient
):
    """Holding every support key does not lift the ownership check."""
    url = f"/support/tickets/{member.ticket_id}"

    listed = await other.get("/support/tickets")
    assert listed.status_code == 200
    assert listed.json()["total"] == 0
    for response in (
        await other.get(url),
        await other.post(f"{url}/messages", json={"body": "x"}),
        await other.post(f"{url}/close"),
    ):
        assert response.status_code == 403
        assert response.json()["error"] == ErrorMessages.TICKET_ACCESS_DENIED


# --- Uploads ----------------------------------------------------------------


@pytest.mark.parametrize("category", ["branding_logo", "user_profile_photo"])
async def test_admin_uploads_through_the_default_role(
    client: AsyncClient, category: str
):
    """A plain admin holds ``user`` by invariant, so its logo upload keeps working."""
    await register_and_verify(client, "brand@test.com")
    await promote_to_admin("brand@test.com")
    await login(client, "brand@test.com")

    response = await client.post("/upload", **PNG_UPLOAD, data={"category": category})

    assert response.status_code == 201, response.text
    assert response.json()["category"] == category


async def test_regular_user_uploads_an_avatar(member: SimpleNamespace):
    """The avatar path keeps working for every account with the default role."""
    response = await member.client.post(
        "/upload", **PNG_UPLOAD, data={"category": "user_profile_photo"}
    )
    assert response.status_code == 201, response.text


async def test_superadmin_uploads_without_any_role(client: AsyncClient):
    """Superadmins bypass the key even with no role row."""
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com")
    await login(client, "root@test.com")
    await _hold_only(await get_user_id(client), set())

    response = await client.post(
        "/upload", **PNG_UPLOAD, data={"category": "branding_logo"}
    )
    assert response.status_code == 201, response.text


async def test_branding_rule_still_applies_behind_the_upload_key(
    member: SimpleNamespace,
):
    """A regular user holding the key is still refused the site-wide bucket."""
    response = await member.client.post(
        "/upload", **PNG_UPLOAD, data={"category": "branding_logo"}
    )
    assert response.status_code == 403


# --- Sockets ----------------------------------------------------------------


@pytest.mark.usefixtures("live_bus")
@pytest.mark.parametrize(
    ("path", "topic"),
    [(path, topic) for path, _permission, topic in GATED_SOCKETS],
    ids=SOCKET_IDS,
)
async def test_socket_accepted_with_the_key_and_receives_its_feed(
    path: str, topic: Callable[[uuid.UUID], str]
):
    """The default role opens the socket, and its feed flows."""
    user = await _seed_account()
    socket = AsgiSocket(path, user.id)

    assert (await socket.handshake())["type"] == "websocket.accept"
    await _settle()
    await realtime.manager.broadcast_local(topic(user.id), "frame")
    assert await socket.next_message() == {"type": "websocket.send", "text": "frame"}
    await socket.leave()
    assert account_topic(user.id) not in realtime.manager._topics


@pytest.mark.parametrize(("path", "permission", "topic"), GATED_SOCKETS, ids=SOCKET_IDS)
async def test_socket_refused_without_the_key(
    path: str, permission: Permission, topic: Callable[[uuid.UUID], str]
):
    """Every other ``self.*`` key is not enough to open the socket."""
    user = await _seed_account()
    await _hold_only(user.id, SELF_PERMISSIONS - {permission})

    message = await AsgiSocket(path, user.id).handshake()

    assert message["type"] == "websocket.close"
    assert message["code"] == POLICY_VIOLATION
    assert topic(user.id) not in realtime.manager._topics


@pytest.mark.usefixtures("live_bus")
@pytest.mark.parametrize(("path", "permission", "topic"), GATED_SOCKETS, ids=SOCKET_IDS)
async def test_open_socket_closed_after_the_key_is_withdrawn(
    path: str,
    permission: Permission,
    topic: Callable[[uuid.UUID], str],
):
    """A live PERMISSIONS_UPDATED closes the socket and stops its feed."""
    user = await _seed_account()
    socket = AsgiSocket(path, user.id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    await _settle()

    await _hold_only(user.id, SELF_PERMISSIONS - {permission})
    await _publish_permissions_updated(user.id)

    message = await socket.next_message()
    assert message["type"] == "websocket.close"
    assert message["code"] == POLICY_VIOLATION

    await realtime.manager.broadcast_local(topic(user.id), "late")
    assert socket.has_no_message()
    await socket.leave()
    assert account_topic(user.id) not in realtime.manager._topics


@pytest.mark.usefixtures("live_bus")
@pytest.mark.parametrize(("path", "permission", "topic"), GATED_SOCKETS, ids=SOCKET_IDS)
async def test_open_socket_survives_an_update_keeping_the_key(
    path: str,
    permission: Permission,
    topic: Callable[[uuid.UUID], str],
):
    """A change that leaves the key in place does not disturb the socket."""
    user = await _seed_account()
    socket = AsgiSocket(path, user.id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    await _settle()

    await _hold_only(user.id, {permission})
    await _publish_permissions_updated(user.id)
    await asyncio.sleep(0.2)

    assert socket.has_no_message()
    await realtime.manager.broadcast_local(topic(user.id), "frame")
    assert (await socket.next_message())["type"] == "websocket.send"
    await socket.leave()


@pytest.mark.parametrize("path", SOCKET_IDS)
async def test_socket_closed_when_the_key_vanished_during_the_handshake(path: str):
    """A revocation between the gate and the subscription is not missed.

    The handshake reads the cache, which still holds the key; the event was
    published before the watcher listened, so only its first check can catch it.
    """
    user = await _seed_account()
    async with TestingSessionLocal() as session:
        await get_effective_permissions(session, user)
    async with TestingSessionLocal() as session:
        await session.execute(
            delete(RbacUserRole).where(RbacUserRole.user_id == user.id)
        )
        await session.commit()

    socket = AsgiSocket(path, user.id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    message = await socket.next_message()

    assert message["type"] == "websocket.close"
    assert message["code"] == POLICY_VIOLATION
    await socket.leave()


async def test_support_socket_cannot_follow_another_users_ticket(
    member: SimpleNamespace,
):
    """The support key opens one's own feed, never someone else's thread."""
    other = await _seed_account()
    socket = AsgiSocket("/support/ws", other.id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    await _settle()

    topic = f"ticket:{member.ticket_id}"
    await socket.send_text(f'{{"action": "subscribe", "topic": "{topic}"}}')
    await asyncio.sleep(0.1)
    await realtime.manager.broadcast_local(topic, "secret")

    assert socket.has_no_message()
    await socket.leave()


async def test_support_socket_follows_the_callers_own_ticket(
    member: SimpleNamespace,
):
    """The ownership check still lets the owner join the thread."""
    socket = AsgiSocket("/support/ws", member.user_id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    await _settle()

    topic = f"ticket:{member.ticket_id}"
    await socket.send_text(f'{{"action": "subscribe", "topic": "{topic}"}}')
    await asyncio.sleep(0.1)
    await realtime.manager.broadcast_local(topic, "thread")

    assert (await socket.next_message())["text"] == "thread"
    await socket.leave()


@pytest.mark.usefixtures("live_bus")
async def test_account_events_socket_stays_in_the_socle():
    """With no role at all, ``/users/me/events`` opens and carries the event."""
    user = await _seed_account()
    await _hold_only(user.id, set())
    socket = AsgiSocket("/users/me/events", user.id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    await _settle()

    await _publish_permissions_updated(user.id)

    message = await socket.next_message()
    assert AccountEventType.PERMISSIONS_UPDATED.value in message["text"]
    await socket.leave()


# --- close_on_permission_loss, independently of any route ---------------------


async def _watch(
    user: User, permission: Permission
) -> tuple[StubSocket, asyncio.Task[None]]:
    """Start a watcher on a stub socket and let it reach its idle wait."""
    socket = StubSocket()
    watcher = close_on_permission_loss(socket, user, permission)
    await _settle()
    return socket, watcher


async def _stop(watcher: asyncio.Task[None]) -> None:
    """Cancel a watcher that is expected to still be running."""
    assert not watcher.done()
    watcher.cancel()
    await asyncio.gather(watcher, return_exceptions=True)


async def _signal(user_id: uuid.UUID, event: AccountEventType) -> None:
    """Deliver an account event to the local subscribers of the account topic."""
    frame = AccountEvent(type=event).model_dump_json()
    await realtime.manager.broadcast_local(account_topic(user_id), frame)


async def _admin_with_support_read() -> User:
    """Create a plain admin holding ``support:read`` through a direct grant."""
    user = await _seed_account(SystemRole.ADMIN)
    await grant_permissions(user.email, [Permission.SUPPORT_READ])
    return user


async def test_watcher_works_with_an_admin_key_when_the_grant_goes():
    """The helper is not tied to ``self.*``: the admin socket reuses it."""
    user = await _admin_with_support_read()
    socket, watcher = await _watch(user, Permission.SUPPORT_READ)
    assert socket.closed_with is None

    async with TestingSessionLocal() as session:
        await session.execute(
            delete(AdminPermission).where(AdminPermission.user_id == user.id)
        )
        await session.commit()
    await _signal(user.id, AccountEventType.PERMISSIONS_UPDATED)
    await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == POLICY_VIOLATION


async def test_watcher_reloads_the_account_and_catches_a_demotion():
    """A demoted admin loses admin keys even while its grant row lingers."""
    user = await _admin_with_support_read()
    socket, watcher = await _watch(user, Permission.SUPPORT_READ)

    async with TestingSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == user.id).values(role=SystemRole.USER.value)
        )
        await session.commit()
    await _signal(user.id, AccountEventType.PERMISSIONS_UPDATED)
    await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == POLICY_VIOLATION


async def test_watcher_closes_for_a_deactivated_account():
    """An account that can no longer pass the handshake loses its socket."""
    user = await _seed_account()
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)

    async with TestingSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == user.id).values(is_active=False)
        )
        await session.commit()
    await _signal(user.id, AccountEventType.PERMISSIONS_UPDATED)
    await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == POLICY_VIOLATION


async def test_watcher_ignores_the_cache_when_it_rechecks():
    """A failed invalidation must not keep a revoked socket open."""
    user = await _seed_account()
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)

    async with TestingSessionLocal() as session:
        assert Permission.SELF_SUPPORT_READ in await get_effective_permissions(
            session, user
        )
        await session.execute(
            delete(RbacUserRole).where(RbacUserRole.user_id == user.id)
        )
        await session.commit()
    await _signal(user.id, AccountEventType.PERMISSIONS_UPDATED)
    await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == POLICY_VIOLATION


async def test_watcher_keeps_a_superadmin_connected():
    """The superadmin bypass applies, with no role row needed."""
    user = await _seed_account(SystemRole.SUPERADMIN)
    await _hold_only(user.id, set())
    socket, watcher = await _watch(user, Permission.SUPPORT_READ)

    await _signal(user.id, AccountEventType.PERMISSIONS_UPDATED)
    await _settle()

    assert socket.closed_with is None
    await _stop(watcher)


async def test_watcher_closes_when_it_cannot_recheck():
    """A database failure fails closed, with a code the client reconnects on."""
    user = await _seed_account()
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)

    broken = MagicMock(side_effect=SQLAlchemyError("down"))
    with patch.object(socket_permissions, "AsyncSessionLocal", broken):
        await _signal(user.id, AccountEventType.PERMISSIONS_UPDATED)
        await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == TRY_AGAIN_LATER


async def test_watcher_closes_when_its_first_check_fails():
    """The very first check fails closed too."""
    user = await _seed_account()
    broken = MagicMock(side_effect=SQLAlchemyError("down"))

    with patch.object(socket_permissions, "AsyncSessionLocal", broken):
        socket = StubSocket()
        await asyncio.wait_for(
            close_on_permission_loss(socket, user, Permission.SELF_SUPPORT_READ),
            timeout=3,
        )

    assert socket.closed_with == TRY_AGAIN_LATER


async def test_watcher_survives_a_socket_already_gone():
    """A close on a dead socket does not surface as a task failure."""

    class GoneSocket(StubSocket):
        """Refuses the close, as Starlette does once the socket is closed."""

        async def close(self, code: int = 1000) -> None:
            """Raise the error Starlette raises on a second close."""
            raise RuntimeError("already closed")

    user = await _seed_account()
    await _hold_only(user.id, set())

    watcher = close_on_permission_loss(GoneSocket(), user, Permission.SELF_SUPPORT_READ)
    await asyncio.wait_for(watcher, timeout=3)


async def test_watcher_leaves_no_subscription_behind_when_cancelled():
    """Cancelling on a normal disconnect drops the account topic subscription."""
    user = await _seed_account()
    _socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)
    assert account_topic(user.id) in realtime.manager._topics

    await _stop(watcher)

    assert account_topic(user.id) not in realtime.manager._topics


async def test_watcher_never_forwards_account_frames_to_the_socket():
    """The account feed stays out of the guarded socket's stream."""
    user = await _seed_account()
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)

    await _signal(user.id, AccountEventType.SESSIONS_REVOKED)
    await _settle()

    assert socket.frames == []
    assert socket.closed_with is None
    await _stop(watcher)


async def test_failed_check_lets_the_handshake_decide_again():
    """After a failure the reconnect is judged by the gate, both ways."""
    user = await _seed_account()
    broken = MagicMock(side_effect=SQLAlchemyError("down"))

    with patch.object(socket_permissions, "AsyncSessionLocal", broken):
        first = AsgiSocket("/support/ws", user.id)
        assert (await first.handshake())["type"] == "websocket.accept"
        assert (await first.next_message())["code"] == TRY_AGAIN_LATER
        await first.leave()

    second = AsgiSocket("/support/ws", user.id)
    assert (await second.handshake())["type"] == "websocket.accept"
    await _settle()
    assert second.has_no_message()
    await second.leave()

    await _hold_only(user.id, set())
    refused = await AsgiSocket("/support/ws", user.id).handshake()
    assert refused["code"] == POLICY_VIOLATION


# --- Bounded wait -------------------------------------------------------------


async def _replace_with_expiring(user: User, via: str, expires_at: datetime) -> None:
    """Leave the account holding the support keys only until ``expires_at``."""
    await _hold_only(user.id, set())
    async with TestingSessionLocal() as session:
        if via == "role":
            stmt = select(RbacRole.id).where(RbacRole.key == "user")
            session.add(
                RbacUserRole(
                    user_id=user.id,
                    role_id=(await session.execute(stmt)).scalar_one(),
                    expires_at=expires_at,
                )
            )
        else:
            stmt = select(RbacPermissionSet.id).where(
                RbacPermissionSet.key == "self.support"
            )
            session.add(
                RbacUserPermissionSet(
                    user_id=user.id,
                    set_id=(await session.execute(stmt)).scalar_one(),
                    expires_at=expires_at,
                )
            )
        await session.commit()
    await invalidate_user_permissions(user.id)


async def test_lost_event_is_caught_by_the_periodic_check(
    monkeypatch: pytest.MonkeyPatch,
):
    """With no event at all, a revocation still closes the socket."""
    monkeypatch.setattr(settings, "RBAC_CACHE_TTL_SECONDS", 0.05)
    user = await _seed_account()
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)
    await _hold_only(user.id, set())

    await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == POLICY_VIOLATION


async def test_periodic_check_leaves_a_valid_socket_open(
    monkeypatch: pytest.MonkeyPatch,
):
    """Waking up on the timer alone does not disturb an account keeping the key."""
    monkeypatch.setattr(settings, "RBAC_CACHE_TTL_SECONDS", 0.02)
    user = await _seed_account()
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)

    await asyncio.sleep(0.2)

    assert socket.closed_with is None
    await _stop(watcher)


@pytest.mark.parametrize("via", ["role", "set"])
async def test_expiring_assignment_closes_the_socket_on_time(via: str):
    """An expiry raises no event: the wait is cut short so the socket still closes."""
    assert settings.RBAC_CACHE_TTL_SECONDS >= 60
    user = await _seed_account()
    await _replace_with_expiring(user, via, utc_now() + timedelta(seconds=0.6))
    socket, watcher = await _watch(user, Permission.SELF_SUPPORT_READ)
    assert socket.closed_with is None

    await asyncio.wait_for(watcher, timeout=3)

    assert socket.closed_with == POLICY_VIOLATION


async def test_expired_support_read_closes_a_live_route_socket():
    """The same end to end: the feed stops with no event once the role expired."""
    user = await _seed_account()
    await _replace_with_expiring(user, "role", utc_now() + timedelta(seconds=0.6))
    socket = AsgiSocket("/support/ws", user.id)
    assert (await socket.handshake())["type"] == "websocket.accept"

    assert (await socket.next_message())["code"] == POLICY_VIOLATION
    await socket.leave()


async def test_recheck_period_is_jittered_and_capped_by_the_next_expiry():
    """Without a near expiry the period holds; a near one shortens it."""
    period = settings.RBAC_CACHE_TTL_SECONDS
    user = await _seed_account()
    check = Permission.SELF_SUPPORT_READ

    delays = {await socket_permissions._recheck_in(user.id, check) for _ in range(5)}
    assert len(delays) > 1
    assert all(period <= delay <= period * 1.1 for delay in delays)

    await _replace_with_expiring(user, "role", utc_now() + timedelta(seconds=30))
    capped = await socket_permissions._recheck_in(user.id, check)
    assert 0 < capped <= 30

    await _replace_with_expiring(user, "role", utc_now() + timedelta(days=1))
    assert await socket_permissions._recheck_in(user.id, check) >= period


# --- watch_socket, independently of any permission ------------------------------


async def test_watch_socket_rechecks_on_its_own_until_refused():
    """The transport follows the delay it is given, then closes on the refusal."""
    answers = iter([0.01, 0.01, None])
    calls = 0

    async def check() -> float | None:
        """Allow twice, then refuse."""
        nonlocal calls
        calls += 1
        return next(answers)

    socket = StubSocket()
    await asyncio.wait_for(watch_socket(socket, topic="any", check=check), timeout=3)

    assert calls == 3
    assert socket.closed_with == POLICY_VIOLATION
    assert "any" not in realtime.manager._topics


async def test_watch_socket_separates_not_knowing_from_a_refusal():
    """A check that raises closes with the code clients reconnect on."""

    async def check() -> float | None:
        """Fail to answer."""
        raise SQLAlchemyError("down")

    socket = StubSocket()
    await asyncio.wait_for(watch_socket(socket, topic="any", check=check), timeout=3)

    assert socket.closed_with == TRY_AGAIN_LATER


# --- A frame racing the close -----------------------------------------------------


async def test_frame_racing_the_close_ends_the_socket_quietly():
    """A frame already read when the watch closes must not raise from the loop."""
    sent: list[dict] = []
    moments = iter(["connect", "frame"])

    async def receive() -> dict:
        """Play the handshake, then deliver a frame as the close goes out."""
        if next(moments) == "connect":
            return {"type": "websocket.connect"}
        await websocket.close(code=POLICY_VIOLATION)
        return {"type": "websocket.receive", "text": "late"}

    async def send(message: dict) -> None:
        """Capture what the server sends."""
        sent.append(message)

    websocket = WebSocket(
        {"type": "websocket", "path": "/", "headers": [], "query_string": b""},
        receive,
        send,
    )

    await asyncio.wait_for(serve_account_socket(websocket, topic="racing"), timeout=3)

    assert sent[-1]["type"] == "websocket.close"
    assert "racing" not in realtime.manager._topics


async def test_runtime_error_on_an_open_socket_still_surfaces():
    """Only the race with a close is swallowed, never a genuine failure."""

    class BrokenSocket(StubSocket):
        """Stays connected while its read fails."""

        application_state = WebSocketState.CONNECTED

        async def accept(self) -> None:
            """Accept the handshake."""

        async def receive_text(self) -> str:
            """Fail with an error that has nothing to do with a close."""
            raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        await serve_account_socket(BrokenSocket(), topic="broken")
    assert "broken" not in realtime.manager._topics


# --- Responses the frontend stores as its current user ----------------------


async def _regular_account(http: AsyncClient) -> str:
    """Create a verified plain account."""
    email = "payload-user@test.com"
    await register_and_verify(http, email)
    return email


async def _admin_account(http: AsyncClient) -> str:
    """Create a verified admin holding one direct grant."""
    email = "payload-admin@test.com"
    await register_and_verify(http, email)
    await promote_to_admin(email)
    await grant_permissions(email, [Permission.STATS_READ])
    return email


@pytest.mark.parametrize(
    ("make_account", "expected_key"),
    [
        (_regular_account, Permission.SELF_PROFILE_UPDATE),
        (_admin_account, Permission.STATS_READ),
    ],
    ids=["regular", "admin"],
)
async def test_login_response_lists_the_permissions_of_users_me(
    client: AsyncClient,
    make_account: Callable[[AsyncClient], Awaitable[str]],
    expected_key: Permission,
):
    """The login response is the ``/users/me`` payload: no second fetch is needed."""
    email = await make_account(client)

    response = await client.post(
        "/auth/login", data={"username": email, "password": "Password123!"}
    )

    assert response.status_code == 200, response.text
    user = response.json()["user"]
    assert expected_key.value in user["permissions"]
    assert user == (await client.get("/users/me")).json()


async def test_login_response_omits_permissions_for_a_superadmin(client: AsyncClient):
    """A superadmin holds every key by role, so the field stays out of the login."""
    email = "payload-root@test.com"
    await register_and_verify(client, email)
    await promote_to_superadmin(email)

    response = await client.post(
        "/auth/login", data={"username": email, "password": "Password123!"}
    )

    assert response.status_code == 200, response.text
    assert "permissions" not in response.json()["user"]


@pytest.mark.parametrize(
    ("make_account", "expected_key"),
    [
        (_regular_account, Permission.SELF_PROFILE_UPDATE),
        (_admin_account, Permission.STATS_READ),
    ],
    ids=["regular", "admin"],
)
async def test_profile_update_response_lists_the_permissions_of_users_me(
    client: AsyncClient,
    make_account: Callable[[AsyncClient], Awaitable[str]],
    expected_key: Permission,
):
    """``PATCH /users/me`` answers with the ``/users/me`` payload."""
    await login(client, await make_account(client))

    response = await client.patch("/users/me", json={"first_name": "Renamed"})

    assert response.status_code == 200, response.text
    user = response.json()["user"]
    assert user["first_name"] == "Renamed"
    assert expected_key.value in user["permissions"]
    assert user == (await client.get("/users/me")).json()
