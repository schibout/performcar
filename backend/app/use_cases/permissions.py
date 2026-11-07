"""Compute what an account may do from its roles, sets and direct grants.

Lives in ``use_cases/`` because the API guards, the ``/users/me`` payload and the
admin services all need the same answer. The cache only ever holds what the
database returned: a failed cache read or an unreadable entry falls back to the
database, and a database failure propagates, so neither grants anything. One
failure can keep access longer: a failed invalidation leaves a revoked key usable
until its entry's TTL ends.
"""

import json
import logging
import uuid
from collections.abc import Iterable
from datetime import UTC, datetime

from fastapi import HTTPException, status
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.core.realtime import account_topic, publish_safe
from app.core.redis import get_redis
from app.models.user import User
from app.repositories.admin.permission import get_user_permissions
from app.repositories.admin.user import is_last_active_admin
from app.repositories.rbac import (
    delete_admin_audience_assignments,
    get_assigned_permissions,
    get_next_assignment_expiry,
    get_permanent_assigned_permissions,
    has_admin_access,
    set_account_tier,
)
from app.schemas.account import AccountEvent, AccountEventType
from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.user import SystemRole
from app.utils import utc_now

logger = logging.getLogger(__name__)

_VERSION_KEY = "rbac:version"
# Must stay well above ``RBAC_CACHE_TTL_SECONDS``: a generation may only reset to
# zero once every entry written under its earlier values has expired.
_GENERATION_TTL_SECONDS = 60 * 60 * 24
# RuntimeError is what ``get_redis`` raises while the client is not initialized.
_REDIS_FAILURES = (RedisError, RuntimeError, OSError)


def _generation_key(user_id: uuid.UUID) -> str:
    """Build the Redis key of an account's cache generation."""
    return f"rbac:gen:{user_id}"


def _cache_key(version: str | int, generation: str | int, user_id: uuid.UUID) -> str:
    """Build the Redis key of an account's permissions for a version and generation."""
    return f"perms:{version}:{generation}:{user_id}"


def _decode_cached(raw: str | None) -> set[Permission] | None:
    """Return the permissions of a cache entry, or None if absent or unreadable."""
    if raw is None:
        return None
    try:
        values = json.loads(raw)
        if not isinstance(values, list):
            return None
        return {Permission(value) for value in values}
    except (ValueError, TypeError):
        return None


async def _read_cache(user_id: uuid.UUID) -> tuple[str | None, set[Permission] | None]:
    """Return the account's cache key and entry, or no key if Redis is unusable.

    The version and generation are read before the database is, so an entry
    computed while an invalidation happens lands under a key nobody reads again.
    """
    try:
        redis = get_redis()
        version, generation = await redis.mget(_VERSION_KEY, _generation_key(user_id))
        key = _cache_key(version or 0, generation or 0, user_id)
        return key, _decode_cached(await redis.get(key))
    except _REDIS_FAILURES as exc:
        logger.warning("Permission cache read failed: %s", exc)
        return None, None


def seconds_until(moment: datetime) -> float:
    """Return the seconds left before a stored date."""
    # SQLite hands timezone-aware columns back naive; every stored date is UTC.
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return (moment - utc_now()).total_seconds()


def _cache_ttl(next_expiry: datetime | None) -> int:
    """Return the entry's lifetime in seconds, capped at the next expiry."""
    if next_expiry is None:
        return settings.RBAC_CACHE_TTL_SECONDS
    # Rounded down so the entry can never outlive the assignment it reflects.
    return min(settings.RBAC_CACHE_TTL_SECONDS, int(seconds_until(next_expiry)))


async def _write_cache(
    key: str, permissions: set[Permission], next_expiry: datetime | None
) -> None:
    """Store the account's permissions, unless they are about to change anyway."""
    ttl = _cache_ttl(next_expiry)
    if ttl < 1:
        return
    payload = json.dumps(sorted(permission.value for permission in permissions))
    try:
        await get_redis().set(key, payload, ex=ttl)
    except _REDIS_FAILURES as exc:
        logger.warning("Permission cache write failed: %s", exc)


async def _read_permissions(
    session: AsyncSession, user_id: uuid.UUID, now: datetime
) -> set[Permission]:
    """Return the union of the assignments valid at ``now`` and the direct grants."""
    assigned = await get_assigned_permissions(session, user_id, now)
    return assigned | set(await get_user_permissions(session, user_id))


async def get_effective_permissions_db(
    session: AsyncSession, user_id: uuid.UUID
) -> set[Permission]:
    """Return an account's permissions straight from the database."""
    return await _read_permissions(session, user_id, utc_now())


async def get_effective_permissions(
    session: AsyncSession, user: User
) -> set[Permission]:
    """Return an account's permissions: every key for a superadmin, else cached."""
    if user.role == SystemRole.SUPERADMIN:
        return set(Permission)

    key, cached = await _read_cache(user.id)
    if cached is not None:
        return cached

    now = utc_now()
    permissions = await _read_permissions(session, user.id, now)
    if key is not None:
        next_expiry = await get_next_assignment_expiry(session, user.id, now)
        await _write_cache(key, permissions, next_expiry)
    return permissions


async def invalidate_user_permissions(user_id: uuid.UUID) -> None:
    """Forget one account's cached permissions by moving to a new generation.

    A Redis failure is logged, not raised: the change it follows is already
    committed, and the stale entry dies with its TTL at the latest.
    """
    key = _generation_key(user_id)
    try:
        async with get_redis().pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, _GENERATION_TTL_SECONDS)
            await pipe.execute()
    except _REDIS_FAILURES as exc:
        logger.error("Permission cache invalidation failed: %s", exc)


async def invalidate_all_permissions() -> None:
    """Forget every account's cached permissions by moving to a new cache version.

    A Redis failure is logged, not raised, as in ``invalidate_user_permissions``.
    """
    try:
        await get_redis().incr(_VERSION_KEY)
    except _REDIS_FAILURES as exc:
        logger.error("Permission cache invalidation failed: %s", exc)


def tier_allows(user: User, permission: Permission) -> bool:
    """Return whether the account's tier may use the key: outside it, ``self.*`` only."""
    return user.role in (
        SystemRole.ADMIN,
        SystemRole.SUPERADMIN,
    ) or is_self_permission(permission)


async def user_has_permission(
    session: AsyncSession, user: User, permission: Permission
) -> bool:
    """Return whether ``user`` may exercise ``permission`` (superadmin bypass).

    The tier gate lives here so the answer is safe even if a non-admin reaches
    an admin key: a demoted account whose grant rows linger, or a caller that
    skips ``CurrentAdminUser``.
    """
    if user.role == SystemRole.SUPERADMIN:
        return True
    if not tier_allows(user, permission):
        return False
    return permission in await get_effective_permissions(session, user)


async def user_has_permission_uncached(
    session: AsyncSession, user: User, permission: Permission
) -> bool:
    """Answer as ``user_has_permission`` does, reading the database, not the cache.

    For a decision that outlives the request, such as keeping a socket open: a
    failed invalidation must not keep it alive past the revocation.
    """
    if user.role == SystemRole.SUPERADMIN:
        return True
    if not tier_allows(user, permission):
        return False
    return permission in await get_effective_permissions_db(session, user.id)


async def ensure_can_grant(
    session: AsyncSession, actor: User, permissions: Iterable[Permission]
) -> None:
    """Raise 403 unless ``actor`` holds every key it is about to hand out.

    A superadmin holds them all. Anyone else counts only what it holds for good,
    its direct grants and the assignments without an end date: a grant has no end
    date, so a temporary key must not outlive its term through an account the
    actor created or edited. Read from the database, not the cache, so a key just
    withdrawn from the actor is not passed on through a stale entry.
    """
    if actor.role == SystemRole.SUPERADMIN:
        return
    held = await get_permanent_assigned_permissions(session, actor.id)
    held |= set(await get_user_permissions(session, actor.id))
    for permission in permissions:
        if permission not in held or not tier_allows(actor, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ErrorMessages.RBAC_PRIVILEGE_ESCALATION,
            )


def guard_superadmin_target(actor: User, target: User) -> None:
    """Block a non-superadmin from acting on a superadmin account at all.

    Superadmin accounts may only be modified, suspended, or deleted by another
    superadmin: no permission grant lets a plain admin touch them.
    """
    if target.role == SystemRole.SUPERADMIN and actor.role != SystemRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN,
        )


async def ensure_can_act_on_admin(
    session: AsyncSession, actor: User, target: User, permission: Permission
) -> None:
    """Demand an ``admins:*`` key from a non-superadmin acting on a plain admin.

    The ``users:*`` routes also reach admin accounts, so without this a low-level
    key could neutralise a stronger admin and the ``admins:*`` gates would mean
    nothing. Read from the database: the check guards an irreversible action.
    """
    if target.role != SystemRole.ADMIN or actor.role == SystemRole.SUPERADMIN:
        return
    if not await user_has_permission_uncached(session, actor, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.INSUFFICIENT_PERMISSIONS,
        )


async def demote_if_no_admin_access(
    session: AsyncSession, target: User, now: datetime
) -> None:
    """Return an admin left without admin access to ``user``, or refuse.

    Called after a change is staged, in its transaction, so the verdict reads the
    state the change leaves: an edit also repairs an admin stuck without keys since
    its assignments lapsed. The last active admin is refused and the change undone.
    Lapsed admin rows go too, as in the promote and demote strip, so they cannot
    come back with a later promotion.
    """
    if target.role != SystemRole.ADMIN.value:
        return
    if await has_admin_access(session, target.id, now):
        return
    if await is_last_active_admin(session, target.id):
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ADMIN_CANNOT_DEMOTE_LAST_ADMIN,
        )
    await delete_admin_audience_assignments(session, target.id)
    await set_account_tier(session, target, SystemRole.USER)


async def signal_permissions_changed(user_id: uuid.UUID) -> None:
    """Wake an account's open sockets so they re-check what it may still do."""
    await publish_safe(
        account_topic(user_id),
        AccountEvent(type=AccountEventType.PERMISSIONS_UPDATED),
    )


async def get_usable_permissions(session: AsyncSession, user: User) -> list[Permission]:
    """Return the sorted keys ``user_has_permission`` accepts for this account."""
    effective = await get_effective_permissions(session, user)
    return sorted(key for key in effective if tier_allows(user, key))
