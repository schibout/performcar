"""Keep a permission-gated socket open only while its owner holds the key.

The transport lives in ``core/realtime.py``; this module supplies the answer it
asks for. Every check uses a short session of its own, since the watch outlives
any request, and reads the database rather than the cache, so a failed
invalidation cannot keep a socket open past the revocation.
"""

import asyncio
import random
import uuid
from datetime import datetime
from functools import partial

from fastapi import WebSocket

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.core.realtime import SocketWatcher, account_topic, watch_socket
from app.models.user import User
from app.repositories.rbac import get_next_assignment_expiry
from app.repositories.user import get_user_by_id
from app.schemas.admin_permission import Permission
from app.use_cases.permissions import seconds_until, user_has_permission_uncached
from app.utils import utc_now

# Spreads the periodic checks of sockets opened together, as a share of the period.
_RECHECK_JITTER = 0.1


def _recheck_delay(next_expiry: datetime | None) -> float:
    """Return the seconds before the next check, at most until the next expiry."""
    period = settings.RBAC_CACHE_TTL_SECONDS
    delay = period + random.uniform(0, period * _RECHECK_JITTER)  # noqa: S311
    if next_expiry is None:
        return delay
    return min(delay, seconds_until(next_expiry))


async def _recheck_in(user_id: uuid.UUID, permission: Permission) -> float | None:
    """Return the seconds this answer holds, or None once the key is gone.

    Reloads the account because its tier or activation may be what changed. A
    failure propagates: not knowing is not the same answer as the key being gone.
    The expiry is read first, so an assignment ending between the two reads is
    caught by the permission check rather than missed until the next period.
    """
    async with AsyncSessionLocal() as session:
        user = await get_user_by_id(session, user_id=user_id)
        if user is None or not user.is_active:
            return None
        next_expiry = await get_next_assignment_expiry(session, user_id, utc_now())
        if not await user_has_permission_uncached(session, user, permission):
            return None
    return _recheck_delay(next_expiry)


def close_on_permission_loss(
    websocket: WebSocket, user: User, permission: Permission
) -> asyncio.Task[None]:
    """Watch an accepted socket and close it when ``user`` loses ``permission``.

    Works with any key. The caller owns the returned task and cancels it when
    the socket ends. Routes pass ``permission_watcher`` to the ``serve_*``
    functions instead of calling this: they start the watch after the handshake.
    """
    return asyncio.create_task(
        watch_socket(
            websocket,
            topic=account_topic(user.id),
            check=partial(_recheck_in, user.id, permission),
        )
    )


def permission_watcher(user: User, permission: Permission) -> SocketWatcher:
    """Build the ``watcher`` argument of the ``serve_*`` functions for this key."""
    return partial(close_on_permission_loss, user=user, permission=permission)
