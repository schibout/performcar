"""Effective permissions: union of sources, cache behaviour and tier gating."""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from inspect import signature
from typing import get_args
from unittest.mock import AsyncMock

import pytest
from fakeredis.aioredis import FakeRedis
from fastapi import HTTPException
from httpx import AsyncClient
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError
from sqlalchemy import delete, select, update

from app.api.deps import (
    ensure_permission,
    get_current_active_user,
    require_any_permission,
    require_permission,
    require_user_permission,
    user_has_permission,
)
from app.core import redis as redis_module
from app.core.config import settings
from app.models.admin_permission import AdminPermission
from app.models.rbac import (
    RbacPermissionSet,
    RbacPermissionSetItem,
    RbacRole,
    RbacRolePermissionSet,
    RbacUserPermissionSet,
    RbacUserRole,
)
from app.models.user import User
from app.repositories.rbac import get_assigned_permissions, get_next_assignment_expiry
from app.schemas.admin_permission import Permission
from app.schemas.user import SystemRole
from app.tests.admin.conftest import (
    login,
    promote_to_superadmin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal
from app.use_cases.permissions import (
    get_effective_permissions,
    get_effective_permissions_db,
    invalidate_all_permissions,
    invalidate_user_permissions,
)
from app.utils import utc_now

VERSION_KEY = "rbac:version"
DEFAULT_ROLE_PERMISSIONS = {
    Permission.SELF_PROFILE_UPDATE,
    Permission.SELF_FILES_UPLOAD,
    Permission.SELF_NOTIFICATIONS_READ,
    Permission.SELF_ASSISTANT_USE,
    Permission.SELF_SUPPORT_READ,
    Permission.SELF_SUPPORT_CREATE,
    Permission.SELF_SUPPORT_REPLY,
    Permission.SELF_SUPPORT_CLOSE,
}


async def _make_user(role: SystemRole = SystemRole.USER) -> User:
    """Persist an account holding no role, set or grant."""
    async with TestingSessionLocal() as session:
        user = User(
            email=f"{uuid.uuid4().hex}@test.com",
            hashed_password="x",
            role=role.value,
        )
        session.add(user)
        await session.commit()
        return user


async def _set_id(key: str) -> uuid.UUID:
    """Return the id of a catalog permission set."""
    async with TestingSessionLocal() as session:
        stmt = select(RbacPermissionSet.id).where(RbacPermissionSet.key == key)
        return (await session.execute(stmt)).scalar_one()


async def _role_id(key: str) -> uuid.UUID:
    """Return the id of a catalog role."""
    async with TestingSessionLocal() as session:
        stmt = select(RbacRole.id).where(RbacRole.key == key)
        return (await session.execute(stmt)).scalar_one()


async def _assign_role(
    user: User, key: str, expires_at: datetime | None = None
) -> None:
    """Assign a catalog role to the account."""
    role_id = await _role_id(key)
    async with TestingSessionLocal() as session:
        session.add(
            RbacUserRole(user_id=user.id, role_id=role_id, expires_at=expires_at)
        )
        await session.commit()


async def _assign_set(user: User, key: str, expires_at: datetime | None = None) -> None:
    """Assign a catalog permission set directly to the account."""
    set_id = await _set_id(key)
    async with TestingSessionLocal() as session:
        session.add(
            RbacUserPermissionSet(user_id=user.id, set_id=set_id, expires_at=expires_at)
        )
        await session.commit()


async def _grant(user: User, permission: Permission) -> None:
    """Insert a direct ``admin_permission`` grant."""
    async with TestingSessionLocal() as session:
        session.add(AdminPermission(user_id=user.id, permission=permission.value))
        await session.commit()


async def _effective(user: User) -> set[Permission]:
    """Resolve the account's permissions through the cache."""
    async with TestingSessionLocal() as session:
        return await get_effective_permissions(session, user)


async def _has(user: User, permission: Permission) -> bool:
    """Run the central authorization check."""
    async with TestingSessionLocal() as session:
        return await user_has_permission(session, user, permission)


def _cache_key(user: User, version: int = 0, generation: int = 0) -> str:
    """Build the expected cache key of an account."""
    return f"perms:{version}:{generation}:{user.id}"


class _BrokenPipeline:
    """A Redis pipeline that queues commands and fails when it runs them."""

    def __init__(self, error: Exception) -> None:
        """Remember the failure to raise."""
        self._error = error

    async def __aenter__(self) -> "_BrokenPipeline":
        """Enter the pipeline context like a real client does."""
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        """Leave the pipeline context without handling the failure."""

    def incr(self, _key: str) -> None:
        """Queue a command, as a real pipeline does without touching the network."""

    def expire(self, _key: str, _seconds: int) -> None:
        """Queue a command, as a real pipeline does without touching the network."""

    async def execute(self) -> None:
        """Fail when the queued commands reach the server."""
        raise self._error


class _BrokenRedis:
    """A Redis client whose every command fails."""

    def __init__(self, error: Exception) -> None:
        """Remember the failure to raise."""
        self._error = error
        self.calls = 0

    def pipeline(self, **_options: object) -> _BrokenPipeline:
        """Return a pipeline that fails on execution, as the real client's does."""
        self.calls += 1
        return _BrokenPipeline(self._error)

    def __getattr__(self, _name: str) -> AsyncMock:
        """Return a command that raises the configured failure."""
        self.calls += 1
        return AsyncMock(side_effect=self._error)


@pytest.fixture
def restore_redis(fake_redis: FakeRedis):
    """Put the fake client back after a test swapped it, for a clean teardown."""
    yield
    redis_module.set_redis_for_testing(fake_redis)


# --- Union of the sources ---------------------------------------------------


async def test_effective_is_union_of_roles_sets_and_direct_grants():
    """Role sets, directly assigned sets and direct grants all count, together."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_role(user, "moderator")
    await _assign_set(user, "broadcast.manage")
    await _grant(user, Permission.STATS_READ)

    expected = {
        Permission.USERS_READ,
        Permission.USERS_SUSPEND,
        Permission.FILES_READ,
        Permission.FILES_DELETE,
        Permission.BROADCAST_READ,
        Permission.BROADCAST_WRITE,
        Permission.STATS_READ,
    }
    async with TestingSessionLocal() as session:
        assert await get_effective_permissions_db(session, user.id) == expected
    assert await _effective(user) == expected


async def test_account_without_any_source_has_nothing():
    """An account with no role, set or grant holds no permission."""
    user = await _make_user()
    assert await _effective(user) == set()
    assert not await _has(user, Permission.SELF_SUPPORT_READ)


async def test_unknown_stored_permission_key_is_skipped():
    """A stored key removed from the enum is ignored rather than raising."""
    user = await _make_user(SystemRole.ADMIN)
    set_id = await _set_id("users.read")
    async with TestingSessionLocal() as session:
        session.add(RbacPermissionSetItem(set_id=set_id, permission="gone:forever"))
        session.add(AdminPermission(user_id=user.id, permission="also:gone"))
        await session.commit()
    await _assign_set(user, "users.read")

    assert await _effective(user) == {Permission.USERS_READ}


async def test_other_accounts_sources_do_not_leak():
    """One account's assignments never count for another one."""
    holder = await _make_user(SystemRole.ADMIN)
    other = await _make_user(SystemRole.ADMIN)
    await _assign_role(holder, "operator")
    await _assign_set(holder, "users.read")
    await _grant(holder, Permission.STATS_READ)

    assert await _effective(other) == set()


async def test_superadmin_holds_everything_without_cache_or_assignment(
    fake_redis: FakeRedis,
):
    """Superadmins resolve to every key from their tier, with no cache entry."""
    user = await _make_user(SystemRole.SUPERADMIN)

    assert await _effective(user) == set(Permission)
    assert await _has(user, Permission.ADMINS_DELETE)
    assert await fake_redis.get(_cache_key(user)) is None


# --- Expiry -----------------------------------------------------------------


async def test_expired_assignment_stops_counting_without_invalidation():
    """Past-dated assignments are ignored and a cached one lapses on its own."""
    user = await _make_user(SystemRole.ADMIN)
    now = utc_now()
    await _assign_role(user, "operator", expires_at=now - timedelta(seconds=1))
    await _assign_set(user, "users.read", expires_at=now - timedelta(seconds=1))
    assert await _effective(user) == set()

    await invalidate_user_permissions(user.id)
    await _assign_set(
        user, "support.agent", expires_at=utc_now() + timedelta(seconds=2)
    )
    assert Permission.SUPPORT_READ in await _effective(user)

    await asyncio.sleep(2.1)

    assert await _effective(user) == set()
    assert not await _has(user, Permission.SUPPORT_READ)


async def test_future_expiry_and_no_expiry_both_count():
    """An assignment counts until its date, or forever without one."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_role(user, "support_agent", expires_at=utc_now() + timedelta(days=1))
    await _assign_set(user, "files.manage")

    assert await _effective(user) == {
        Permission.USERS_READ,
        Permission.SUPPORT_READ,
        Permission.SUPPORT_WRITE,
        Permission.FILES_READ,
        Permission.FILES_DELETE,
    }


async def test_expired_role_keeps_the_same_permission_from_another_source():
    """Losing one source leaves a permission still held through another."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_role(user, "support_agent", expires_at=utc_now() - timedelta(hours=1))
    await _grant(user, Permission.SUPPORT_READ)

    assert await _effective(user) == {Permission.SUPPORT_READ}


async def test_cache_uses_the_configured_ttl_without_a_nearer_expiry(
    fake_redis: FakeRedis,
):
    """With no expiry within reach the entry lives ``RBAC_CACHE_TTL_SECONDS``."""
    assert settings.RBAC_CACHE_TTL_SECONDS == 300
    user = await _make_user(SystemRole.ADMIN)
    await _assign_set(user, "users.read", expires_at=utc_now() + timedelta(hours=1))
    await _assign_role(user, "operator")

    await _effective(user)

    assert 295 <= await fake_redis.ttl(_cache_key(user)) <= 300


@pytest.mark.parametrize("via", ["role", "set"])
async def test_cache_ttl_is_capped_at_the_next_expiry(fake_redis: FakeRedis, via: str):
    """The entry dies no later than the nearest assignment expiry of any kind."""
    user = await _make_user(SystemRole.ADMIN)
    soon = utc_now() + timedelta(seconds=30)
    if via == "role":
        await _assign_role(user, "operator", expires_at=soon)
        await _assign_set(user, "users.read", expires_at=soon + timedelta(hours=1))
    else:
        await _assign_set(user, "users.read", expires_at=soon)
        await _assign_role(user, "operator", expires_at=soon + timedelta(hours=1))

    await _effective(user)

    assert 25 <= await fake_redis.ttl(_cache_key(user)) <= 30


async def test_already_expired_assignment_does_not_cap_the_ttl(fake_redis: FakeRedis):
    """A lapsed assignment leaves the entry on the configured duration."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_set(user, "users.read", expires_at=utc_now() - timedelta(hours=1))

    await _effective(user)

    assert 295 <= await fake_redis.ttl(_cache_key(user)) <= 300


async def test_assignment_expiring_within_a_second_is_not_cached(fake_redis: FakeRedis):
    """Too close to its expiry, the result is returned but never stored."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_set(
        user, "users.read", expires_at=utc_now() + timedelta(milliseconds=800)
    )

    assert await _effective(user) == {Permission.USERS_READ}
    assert await fake_redis.get(_cache_key(user)) is None


async def test_next_assignment_expiry_ignores_lapsed_and_unlimited_rows():
    """The next expiry is the earliest future date across both assignment kinds."""
    user = await _make_user(SystemRole.ADMIN)
    now = utc_now()
    await _assign_role(user, "operator")
    await _assign_role(user, "auditor", expires_at=now - timedelta(hours=1))
    await _assign_set(user, "users.read", expires_at=now + timedelta(hours=2))

    async with TestingSessionLocal() as session:
        found = await get_next_assignment_expiry(session, user.id, now)

    assert found is not None
    assert found.replace(tzinfo=None) == (now + timedelta(hours=2)).replace(tzinfo=None)


# --- Tier gating ------------------------------------------------------------


async def test_admin_permission_ignored_for_user_tier():
    """A lingering admin key never authorizes an account outside the admin tier."""
    user = await _make_user(SystemRole.USER)
    await _grant(user, Permission.USERS_READ)
    await _assign_set(user, "files.manage")

    assert not await _has(user, Permission.USERS_READ)
    assert not await _has(user, Permission.FILES_READ)


async def test_self_permission_works_for_user_tier():
    """Self-service keys follow the effective set for regular accounts."""
    user = await _make_user(SystemRole.USER)
    await _assign_role(user, "user_restricted")

    assert await _has(user, Permission.SELF_SUPPORT_READ)
    assert not await _has(user, Permission.SELF_SUPPORT_CREATE)


async def test_admin_tier_needs_the_key_in_its_effective_set():
    """A plain admin passes on its grants and fails on anything else."""
    user = await _make_user(SystemRole.ADMIN)
    await _grant(user, Permission.STATS_READ)

    assert await _has(user, Permission.STATS_READ)
    assert not await _has(user, Permission.USERS_READ)
    assert not await _has(user, Permission.SELF_SUPPORT_READ)


async def test_ensure_permission_raises_403_when_refused():
    """The raising counterpart turns a refusal into a 403."""
    user = await _make_user(SystemRole.USER)
    async with TestingSessionLocal() as session:
        with pytest.raises(HTTPException) as caught:
            await ensure_permission(session, user, Permission.SELF_SUPPORT_READ)
    assert caught.value.status_code == 403


async def test_factories_expose_their_permission():
    """Both factories label their dependency for the route coverage check."""
    assert (
        require_permission(Permission.USERS_READ).__rbac_permission__
        == Permission.USERS_READ
    )
    assert (
        require_user_permission(Permission.SELF_SUPPORT_READ).__rbac_permission__
        == Permission.SELF_SUPPORT_READ
    )


async def test_require_any_permission_exposes_the_tuple_and_needs_one_key():
    """The any-of factory labels its keys and refuses an admin holding none."""
    dependency = require_any_permission(
        Permission.ROLES_READ, Permission.PERMISSION_SETS_READ
    )
    assert dependency.__rbac_permission__ == (
        Permission.ROLES_READ,
        Permission.PERMISSION_SETS_READ,
    )

    admin = await _make_user(SystemRole.ADMIN)
    await _grant(admin, Permission.USERS_READ)
    async with TestingSessionLocal() as session:
        with pytest.raises(HTTPException) as caught:
            await dependency(admin, session)
    assert caught.value.status_code == 403

    await _grant(admin, Permission.PERMISSION_SETS_READ)
    await invalidate_user_permissions(admin.id)
    async with TestingSessionLocal() as session:
        assert await dependency(admin, session) is admin


async def test_require_user_permission_accepts_regular_user_holding_the_key():
    """The user factory does not demand the admin tier."""
    user = await _make_user(SystemRole.USER)
    await _assign_role(user, "user")
    dependency = require_user_permission(Permission.SELF_SUPPORT_READ)

    async with TestingSessionLocal() as session:
        assert await dependency(user, session) is user


async def test_require_user_permission_refuses_without_the_key():
    """The user factory answers 403 when the key is missing."""
    user = await _make_user(SystemRole.USER)
    dependency = require_user_permission(Permission.SELF_SUPPORT_READ)

    async with TestingSessionLocal() as session:
        with pytest.raises(HTTPException) as caught:
            await dependency(user, session)
    assert caught.value.status_code == 403


async def test_require_user_permission_resolves_the_active_user():
    """The user factory hangs off the active-account dependency, not the admin one."""
    dependency = require_user_permission(Permission.SELF_SUPPORT_READ)
    annotation = signature(dependency).parameters["user"].annotation

    assert get_args(annotation)[1].dependency is get_current_active_user


# --- Redis failures ---------------------------------------------------------


@pytest.mark.parametrize(
    "error",
    [RedisError("boom"), RedisConnectionError("down"), OSError("net"), TimeoutError()],
)
@pytest.mark.usefixtures("restore_redis")
async def test_redis_failure_falls_back_to_database_and_never_grants(
    error: Exception,
):
    """Without Redis the answer comes from the database, with nothing extra."""
    user = await _make_user(SystemRole.ADMIN)
    await _grant(user, Permission.STATS_READ)
    broken = _BrokenRedis(error)
    redis_module.set_redis_for_testing(broken)

    assert await _effective(user) == {Permission.STATS_READ}
    assert await _has(user, Permission.STATS_READ)
    assert not await _has(user, Permission.USERS_READ)
    assert broken.calls > 0


@pytest.mark.usefixtures("restore_redis")
async def test_uninitialized_redis_falls_back_to_database():
    """A process without a Redis client still answers from the database."""
    user = await _make_user(SystemRole.ADMIN)
    await _grant(user, Permission.STATS_READ)
    redis_module.set_redis_for_testing(None)

    assert await _effective(user) == {Permission.STATS_READ}


async def test_redis_write_failure_still_returns_the_database_answer(
    fake_redis: FakeRedis, monkeypatch: pytest.MonkeyPatch
):
    """A read that works followed by a failing write does not break the check."""
    user = await _make_user(SystemRole.ADMIN)
    await _grant(user, Permission.STATS_READ)
    monkeypatch.setattr(fake_redis, "set", AsyncMock(side_effect=RedisError("full")))

    assert await _effective(user) == {Permission.STATS_READ}


async def test_database_failure_is_not_swallowed(monkeypatch: pytest.MonkeyPatch):
    """A database error surfaces instead of resolving to some default answer."""
    user = await _make_user(SystemRole.ADMIN)
    monkeypatch.setattr(
        "app.use_cases.permissions.get_assigned_permissions",
        AsyncMock(side_effect=RuntimeError("db down")),
    )

    with pytest.raises(RuntimeError):
        await _effective(user)


@pytest.mark.parametrize("error", [RedisError("boom"), OSError("net")])
@pytest.mark.usefixtures("restore_redis")
async def test_invalidation_tolerates_redis_failure(error: Exception):
    """A committed change is not turned into an error by a Redis outage."""
    redis_module.set_redis_for_testing(_BrokenRedis(error))

    await invalidate_user_permissions(uuid.uuid4())
    await invalidate_all_permissions()


@pytest.mark.parametrize(
    "corrupted",
    ["not json", "{}", '"users:read"', "[1]", '["no:such_key"]', "null"],
)
async def test_corrupted_cache_entry_is_replaced_from_the_database(
    fake_redis: FakeRedis, corrupted: str
):
    """An unreadable entry counts as a miss and never grants anything."""
    user = await _make_user(SystemRole.ADMIN)
    await _grant(user, Permission.STATS_READ)
    await fake_redis.set(_cache_key(user), corrupted)

    assert await _effective(user) == {Permission.STATS_READ}
    assert json.loads(await fake_redis.get(_cache_key(user))) == ["stats:read"]


# --- Cache behaviour --------------------------------------------------------


async def test_result_is_served_from_the_cache(fake_redis: FakeRedis):
    """A cached entry answers without reading the database again."""
    user = await _make_user(SystemRole.ADMIN)
    await _grant(user, Permission.STATS_READ)
    assert await _effective(user) == {Permission.STATS_READ}

    await fake_redis.set(_cache_key(user), json.dumps(["users:read"]))

    assert await _effective(user) == {Permission.USERS_READ}


async def test_empty_result_is_cached_as_a_hit(fake_redis: FakeRedis):
    """An account holding nothing is still cached, not recomputed each request."""
    user = await _make_user(SystemRole.ADMIN)

    assert await _effective(user) == set()
    assert await fake_redis.get(_cache_key(user)) == "[]"

    await _grant(user, Permission.STATS_READ)
    assert await _effective(user) == set()


async def test_role_change_is_visible_after_invalidation():
    """A changed assignment shows after invalidating, for each invalidation kind."""
    user = await _make_user(SystemRole.ADMIN)
    assert await _effective(user) == set()

    await _assign_set(user, "users.read")
    assert await _effective(user) == set()
    await invalidate_user_permissions(user.id)
    assert await _effective(user) == {Permission.USERS_READ}

    async with TestingSessionLocal() as session:
        await session.execute(
            delete(RbacUserPermissionSet).where(
                RbacUserPermissionSet.user_id == user.id
            )
        )
        await session.commit()
    assert await _effective(user) == {Permission.USERS_READ}
    await invalidate_all_permissions()
    assert await _effective(user) == set()


async def test_invalidation_targets_a_single_account():
    """Invalidating one account leaves another one's entry in place."""
    first = await _make_user(SystemRole.ADMIN)
    second = await _make_user(SystemRole.ADMIN)
    await _effective(first)
    await _effective(second)
    await _grant(first, Permission.STATS_READ)
    await _grant(second, Permission.STATS_READ)

    await invalidate_user_permissions(first.id)

    assert await _effective(first) == {Permission.STATS_READ}
    assert await _effective(second) == set()


async def test_global_invalidation_bumps_the_version(fake_redis: FakeRedis):
    """``rbac:version`` drives the key, so old entries stop being read."""
    user = await _make_user(SystemRole.ADMIN)
    await _effective(user)
    assert await fake_redis.get(_cache_key(user, 0)) == "[]"

    await invalidate_all_permissions()

    assert await fake_redis.get(VERSION_KEY) == "1"
    await _effective(user)
    assert await fake_redis.get(_cache_key(user, 1)) == "[]"


async def test_user_invalidation_after_a_version_bump_moves_to_a_new_generation(
    fake_redis: FakeRedis,
):
    """Per-account invalidation keeps the version and moves the generation."""
    user = await _make_user(SystemRole.ADMIN)
    await invalidate_all_permissions()
    await _effective(user)
    assert await fake_redis.get(_cache_key(user, 1, 0)) == "[]"

    await invalidate_user_permissions(user.id)
    await _grant(user, Permission.STATS_READ)

    assert await _effective(user) == {Permission.STATS_READ}
    assert await fake_redis.get(_cache_key(user, 1, 1)) == '["stats:read"]'


async def test_generation_outlives_every_entry_and_then_expires(fake_redis: FakeRedis):
    """The generation key lasts far beyond an entry, without staying forever."""
    user = await _make_user(SystemRole.ADMIN)

    await invalidate_user_permissions(user.id)

    generation_ttl = await fake_redis.ttl(f"rbac:gen:{user.id}")
    assert settings.RBAC_CACHE_TTL_SECONDS * 10 < generation_ttl <= 86400


async def test_revocation_during_a_cache_fill_is_not_overwritten(
    monkeypatch: pytest.MonkeyPatch,
):
    """A reader that read before a revocation cannot cache the revoked key."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_set(user, "users.read")

    async def _revoke_after_reading(*args: object) -> set[Permission]:
        """Return the old answer once the revocation committed behind the reader."""
        monkeypatch.setattr(
            "app.use_cases.permissions.get_assigned_permissions",
            get_assigned_permissions,
        )
        old = await get_assigned_permissions(*args)
        async with TestingSessionLocal() as session:
            await session.execute(
                delete(RbacUserPermissionSet).where(
                    RbacUserPermissionSet.user_id == user.id
                )
            )
            await session.commit()
        await invalidate_user_permissions(user.id)
        return old

    monkeypatch.setattr(
        "app.use_cases.permissions.get_assigned_permissions",
        _revoke_after_reading,
    )

    assert await _effective(user) == {Permission.USERS_READ}

    assert await _effective(user) == set()
    assert not await _has(user, Permission.USERS_READ)


async def test_set_added_to_a_role_shows_after_global_invalidation():
    """A role's added set is reflected once the cache is invalidated globally."""
    user = await _make_user(SystemRole.ADMIN)
    await _assign_role(user, "operator")
    assert Permission.USERS_READ not in await _effective(user)

    operator_id = await _role_id("operator")
    set_id = await _set_id("users.read")
    async with TestingSessionLocal() as session:
        session.add(RbacRolePermissionSet(role_id=operator_id, set_id=set_id))
        await session.commit()
    await invalidate_all_permissions()

    assert Permission.USERS_READ in await _effective(user)


# --- Plain admins managed through the existing endpoints --------------------


async def _root_client(client: AsyncClient) -> None:
    """Authenticate the client as the root superadmin."""
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com", root=True)
    await login(client, "root@test.com")


async def test_direct_grant_change_applies_immediately(client: AsyncClient):
    """Editing an admin's grants takes effect at once despite a cached entry."""
    await _root_client(client)
    admin = await _make_user(SystemRole.ADMIN)
    await _grant(admin, Permission.USERS_READ)
    assert await _has(admin, Permission.USERS_READ)

    response = await client.patch(
        f"/admin/admins/{admin.id}/permissions",
        json={"permissions": [Permission.STATS_READ.value]},
    )

    assert response.status_code == 200
    assert not await _has(admin, Permission.USERS_READ)
    assert await _has(admin, Permission.STATS_READ)


async def test_promotion_drops_the_cached_grants(client: AsyncClient):
    """Promoting clears the entry, so the emptied grants read as empty afterwards."""
    await _root_client(client)
    admin = await _make_user(SystemRole.ADMIN)
    await _grant(admin, Permission.USERS_READ)
    assert await _has(admin, Permission.USERS_READ)

    response = await client.post(f"/admin/admins/{admin.id}/promote")

    assert response.status_code == 200
    async with TestingSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == admin.id).values(role=SystemRole.ADMIN.value)
        )
        await session.commit()
        fresh = await session.get(User, admin.id)
        assert not await user_has_permission(session, fresh, Permission.USERS_READ)


async def test_demotion_drops_a_cached_entry(
    client: AsyncClient, fake_redis: FakeRedis
):
    """A demoted superadmin starts from its emptied grants, not an old entry."""
    await _root_client(client)
    target = await _make_user(SystemRole.SUPERADMIN)
    await fake_redis.set(_cache_key(target), json.dumps(["users:read"]))

    response = await client.post(f"/admin/admins/{target.id}/demote")

    assert response.status_code == 200
    async with TestingSessionLocal() as session:
        fresh = await session.get(User, target.id)
        assert fresh.role == SystemRole.ADMIN.value
        assert not await user_has_permission(session, fresh, Permission.USERS_READ)


# --- /users/me --------------------------------------------------------------


async def test_users_me_lists_self_permissions_for_regular_user(client: AsyncClient):
    """A regular account receives the keys of its default role."""
    await register_and_verify(client, "plain@test.com")
    await login(client, "plain@test.com")

    body = (await client.get("/users/me")).json()

    assert set(body["permissions"]) == {key.value for key in DEFAULT_ROLE_PERMISSIONS}
    assert body["permissions"] == sorted(body["permissions"])


async def test_users_me_lists_only_usable_keys_for_regular_user(client: AsyncClient):
    """The list matches the checks: admin keys are withheld outside the admin tier."""
    await register_and_verify(client, "lingering@test.com")
    async with TestingSessionLocal() as session:
        stmt = select(User).where(User.email == "lingering@test.com")
        user = (await session.execute(stmt)).scalars().one()
    await _grant(user, Permission.USERS_READ)
    await _assign_set(user, "files.manage")
    await login(client, "lingering@test.com")

    body = (await client.get("/users/me")).json()

    assert set(body["permissions"]) == {key.value for key in DEFAULT_ROLE_PERMISSIONS}


async def test_users_me_lists_nothing_for_account_without_role(client: AsyncClient):
    """An account stripped of every assignment gets an empty list, not no field."""
    await register_and_verify(client, "stripped@test.com")
    async with TestingSessionLocal() as session:
        stmt = select(User.id).where(User.email == "stripped@test.com")
        user_id = (await session.execute(stmt)).scalar_one()
        await session.execute(
            delete(RbacUserRole).where(RbacUserRole.user_id == user_id)
        )
        await session.commit()
    await login(client, "stripped@test.com")

    assert (await client.get("/users/me")).json()["permissions"] == []


async def test_users_me_still_omits_the_list_for_superadmin(client: AsyncClient):
    """Superadmins keep receiving no list: their tier implies everything."""
    await _root_client(client)

    assert "permissions" not in (await client.get("/users/me")).json()


async def test_deleting_the_assigning_admin_clears_assigned_by():
    """Assignments outlive the admin who made them, without a reference to it."""
    assigner = await _make_user(SystemRole.ADMIN)
    holder = await _make_user()
    role_id = await _role_id("support_agent")
    set_id = await _set_id("users.read")
    async with TestingSessionLocal() as session:
        session.add_all(
            [
                RbacUserRole(
                    user_id=holder.id, role_id=role_id, assigned_by=assigner.id
                ),
                RbacUserPermissionSet(
                    user_id=holder.id, set_id=set_id, assigned_by=assigner.id
                ),
            ]
        )
        await session.commit()

    async with TestingSessionLocal() as session:
        await session.execute(delete(User).where(User.id == assigner.id))
        await session.commit()

    async with TestingSessionLocal() as session:
        role_row = await session.execute(
            select(RbacUserRole).where(RbacUserRole.user_id == holder.id)
        )
        set_row = await session.execute(
            select(RbacUserPermissionSet).where(
                RbacUserPermissionSet.user_id == holder.id
            )
        )
        assert role_row.scalars().one().assigned_by is None
        assert set_row.scalars().one().assigned_by is None
