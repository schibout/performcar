"""Short-lived conversation tickets letting the assistant's tools act as a user.

A ticket is an opaque random string mapped in Redis to the user and the login
session it was issued from. On its own it opens nothing: the API also demands
``ASSISTANT_SERVICE_KEY``, which only the Hermes MCP server holds.
"""

import json
import secrets
import uuid

from app.core.config import settings
from app.core.redis import get_redis


def _key(ticket: str) -> str:
    """Build the Redis key of a ticket."""
    return f"assistant:ticket:{ticket}"


async def issue_ticket(user_id: uuid.UUID, session_id: str | None) -> str:
    """Create a ticket for ``user_id`` that expires on its own."""
    ticket = secrets.token_urlsafe(32)
    payload = json.dumps({"user_id": str(user_id), "sid": session_id})
    await get_redis().set(
        _key(ticket), payload, ex=settings.ASSISTANT_TICKET_TTL_SECONDS
    )
    return ticket


async def resolve_ticket(ticket: str) -> tuple[uuid.UUID, str | None] | None:
    """Return the user id and session id of a live ticket, or None."""
    raw = await get_redis().get(_key(ticket))
    if raw is None:
        return None
    try:
        data = json.loads(raw)
        return uuid.UUID(data["user_id"]), data.get("sid")
    except (ValueError, KeyError, TypeError):
        return None


async def revoke_ticket(ticket: str) -> None:
    """Delete a ticket once its conversation turn is over."""
    await get_redis().delete(_key(ticket))
