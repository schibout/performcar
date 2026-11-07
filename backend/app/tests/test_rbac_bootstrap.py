"""System RBAC catalog bootstrap and default-role assignment."""

import importlib.util
from pathlib import Path
from types import ModuleType
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import bootstrap
from app.core.config import settings
from app.core.rbac_catalog import (
    DEFAULT_USER_ROLE_ID,
    DEFAULT_USER_ROLE_KEY,
    SYSTEM_PERMISSION_SETS,
    SYSTEM_ROLES,
)
from app.models.admin_permission import AdminPermission
from app.models.rbac import (
    RbacPermissionSet,
    RbacPermissionSetItem,
    RbacRole,
    RbacRolePermissionSet,
    RbacUserRole,
)
from app.models.user import User
from app.repositories import rbac as rbac_repository
from app.repositories.rbac import ensure_rbac_catalog
from app.repositories.user import create_user
from app.schemas.admin_permission import Permission
from app.schemas.rbac import RbacAudience, permissions_allowed_for
from app.schemas.user import SystemRole
from app.tests.admin.conftest import (
    grant_permissions,
    login,
    promote_to_admin,
    promote_to_superadmin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal

_VERSIONS = Path(__file__).resolve().parents[1] / "alembic" / "versions"

_EXPECTED_SETS = {
    "self.basic": {
        "self.profile:update",
        "self.files:upload",
        "self.notifications:read",
    },
    "self.support": {
        "self.support:read",
        "self.support:create",
        "self.support:reply",
        "self.support:close",
    },
    "self.readonly": {"self.notifications:read", "self.support:read"},
    "dealer.sales": {
        "self.quotes:read",
        "self.quotes:create",
        "self.quotes:write",
        "self.quotes:delete",
        "self.customers:read",
        "self.customers:create",
        "self.customers:write",
        "self.customers:delete",
        "self.catalog:read",
        "self.dealership:read",
        "self.dealership:write",
    },
    "quotes.manage": {
        "quotes:read",
        "quotes:write",
        "quotes:delete",
        "customers:read",
        "customers:write",
        "customers:delete",
    },
    "catalog.manage": {"catalog:read", "catalog:write"},
    "dealerships.manage": {
        "dealerships:read",
        "dealerships:write",
        "dealerships:delete",
    },
    "users.read": {"users:read"},
    "users.manage": {
        "users:read",
        "users:write",
        "users:password_reset",
        "users:unlock",
    },
    "users.suspend": {"users:suspend"},
    "users.delete": {"users:delete"},
    "users.sessions": {"users:sessions"},
    "users.security": {"users:mfa_reset"},
    "support.agent": {"support:read", "support:write"},
    "support.manager": {"support:read", "support:write", "support:update"},
    "files.manage": {"files:read", "files:delete"},
    "broadcast.manage": {"broadcast:read", "broadcast:write"},
    "audit.read": {"activities:read", "stats:read"},
    "system.config": {"system_settings:read", "system_settings:write"},
    "rbac.read": {"roles:read", "permission_sets:read", "admins:read"},
    "rbac.manage": {
        "roles:write",
        "permission_sets:write",
        "admins:write",
        "admins:delete",
        "roles:read",
        "permission_sets:read",
        "admins:read",
    },
}

_EXPECTED_ROLES = {
    "user": {"self.basic", "self.support"},
    "user_restricted": {"self.readonly"},
    "dealer": {"dealer.sales"},
    "dealer_network_admin": {
        "quotes.manage",
        "catalog.manage",
        "dealerships.manage",
        "users.manage",
        "users.sessions",
        "audit.read",
    },
    "administrator": {
        "users.manage",
        "users.suspend",
        "users.delete",
        "users.sessions",
        "files.manage",
        "broadcast.manage",
        "audit.read",
        "support.manager",
    },
    "support_agent": {"users.read", "support.agent"},
    "support_manager": {"users.read", "users.sessions", "support.manager"},
    "moderator": {"users.read", "users.suspend", "files.manage"},
    "auditor": {"users.read", "audit.read", "rbac.read"},
    "operator": {"system.config", "audit.read"},
}


async def _count(session: AsyncSession, model: type) -> int:
    """Return the number of rows of an ORM model."""
    return (await session.execute(select(func.count()).select_from(model))).scalar_one()


async def _set_contents(session: AsyncSession) -> dict[str, set[str]]:
    """Return the stored ``set key -> permissions`` map."""
    rows = await session.execute(
        select(RbacPermissionSet.key, RbacPermissionSetItem.permission).join(
            RbacPermissionSetItem,
            RbacPermissionSetItem.set_id == RbacPermissionSet.id,
        )
    )
    contents: dict[str, set[str]] = {}
    for key, permission in rows:
        contents.setdefault(key, set()).add(permission)
    return contents


async def _role_contents(session: AsyncSession) -> dict[str, set[str]]:
    """Return the stored ``role key -> set keys`` map."""
    rows = await session.execute(
        select(RbacRole.key, RbacPermissionSet.key)
        .join(RbacRolePermissionSet, RbacRolePermissionSet.role_id == RbacRole.id)
        .join(RbacPermissionSet, RbacPermissionSet.id == RbacRolePermissionSet.set_id)
    )
    contents: dict[str, set[str]] = {}
    for role_key, set_key in rows:
        contents.setdefault(role_key, set()).add(set_key)
    return contents


async def _default_role_holders(
    session: AsyncSession, email: str
) -> list[RbacUserRole]:
    """Return the default-role rows held by the account with this email."""
    rows = await session.execute(
        select(RbacUserRole)
        .join(User, User.id == RbacUserRole.user_id)
        .where(User.email == email, RbacUserRole.role_id == DEFAULT_USER_ROLE_ID)
    )
    return list(rows.scalars().all())


def _load_rbac_migration() -> ModuleType:
    """Import the RBAC migration from its file (``versions`` is no package)."""
    path = next(_VERSIONS.glob("*_add_rbac_tables.py"))
    spec = importlib.util.spec_from_file_location("rbac_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def test_catalog_matches_the_specified_sets_and_roles():
    """The stored catalog holds exactly the specified sets, roles and contents."""
    async with TestingSessionLocal() as session:
        await ensure_rbac_catalog(session)

        assert await _set_contents(session) == _EXPECTED_SETS
        assert await _role_contents(session) == _EXPECTED_ROLES
        system_flags = await session.execute(select(RbacRole.is_system))
        assert all(system_flags.scalars().all())


async def test_catalog_is_idempotent():
    """Running the catalog twice leaves one row per system element."""
    async with TestingSessionLocal() as session:
        await ensure_rbac_catalog(session)
        await ensure_rbac_catalog(session)

        assert await _count(session, RbacPermissionSet) == len(SYSTEM_PERMISSION_SETS)
        assert await _count(session, RbacRole) == len(SYSTEM_ROLES)
        assert await _count(session, RbacPermissionSetItem) == sum(
            len(definition.permissions) for definition in SYSTEM_PERMISSION_SETS
        )
        assert await _count(session, RbacRolePermissionSet) == sum(
            len(definition.set_keys) for definition in SYSTEM_ROLES
        )


async def test_catalog_restores_tampered_system_role():
    """Fields, role links and set items altered in the database are restored."""
    async with TestingSessionLocal() as session:
        await ensure_rbac_catalog(session)
        role = (
            await session.execute(select(RbacRole).where(RbacRole.key == "moderator"))
        ).scalar_one()
        tampered_set = (
            await session.execute(
                select(RbacPermissionSet).where(RbacPermissionSet.key == "users.read")
            )
        ).scalar_one()
        extra_set = (
            await session.execute(
                select(RbacPermissionSet).where(
                    RbacPermissionSet.key == "system.config"
                )
            )
        ).scalar_one()
        role_id = role.id
        role.name = "Tampered"
        role.is_system = False
        role.audience = RbacAudience.USER.value
        tampered_set.description = "Tampered"
        await session.execute(
            delete(RbacRolePermissionSet).where(
                RbacRolePermissionSet.role_id == role_id,
                RbacRolePermissionSet.set_id == tampered_set.id,
            )
        )
        session.add(RbacRolePermissionSet(role_id=role_id, set_id=extra_set.id))
        session.add(
            RbacPermissionSetItem(
                set_id=tampered_set.id, permission=Permission.USERS_DELETE.value
            )
        )
        await session.commit()

        await ensure_rbac_catalog(session)

    async with TestingSessionLocal() as session:
        restored = (
            await session.execute(select(RbacRole).where(RbacRole.key == "moderator"))
        ).scalar_one()
        definition = next(item for item in SYSTEM_ROLES if item.key == "moderator")
        assert restored.id == role_id
        assert restored.name == definition.name
        assert restored.is_system is True
        assert restored.audience == RbacAudience.ADMIN.value
        assert await _role_contents(session) == _EXPECTED_ROLES
        assert await _set_contents(session) == _EXPECTED_SETS


async def test_catalog_completes_the_role_row_seeded_by_the_migration():
    """A bare ``user`` role row keeps its id and gets its content on boot."""
    async with TestingSessionLocal() as session:
        await ensure_rbac_catalog(session)
        await session.execute(
            delete(RbacRolePermissionSet).where(
                RbacRolePermissionSet.role_id == DEFAULT_USER_ROLE_ID
            )
        )
        await session.execute(
            update(RbacRole)
            .where(RbacRole.id == DEFAULT_USER_ROLE_ID)
            .values(description=None)
        )
        await session.commit()

        await ensure_rbac_catalog(session)

    async with TestingSessionLocal() as session:
        role = (
            await session.execute(
                select(RbacRole).where(RbacRole.key == DEFAULT_USER_ROLE_KEY)
            )
        ).scalar_one()
        assert role.id == DEFAULT_USER_ROLE_ID
        assert role.description
        assert (await _role_contents(session))["user"] == _EXPECTED_ROLES["user"]


async def test_catalog_retries_after_a_concurrent_boot_conflict():
    """A uniqueness conflict from another process is retried, not raised."""
    real_sync = rbac_repository._sync_catalog
    calls = 0

    async def _conflict_once(session: AsyncSession) -> None:
        """Fail the first synchronisation like a losing concurrent insert."""
        nonlocal calls
        calls += 1
        if calls == 1:
            raise IntegrityError("INSERT", {}, Exception("duplicate key"))
        await real_sync(session)

    async with TestingSessionLocal() as session:
        with patch.object(rbac_repository, "_sync_catalog", new=_conflict_once):
            await ensure_rbac_catalog(session)

        assert calls == 2
        assert await _set_contents(session) == _EXPECTED_SETS


async def test_catalog_only_uses_valid_permissions_per_audience():
    """Sets respect their audience; roles reference same-audience sets only."""
    sets_by_key = {definition.key: definition for definition in SYSTEM_PERMISSION_SETS}

    for definition in SYSTEM_PERMISSION_SETS:
        assert permissions_allowed_for(definition.audience, definition.permissions), (
            definition.key
        )
    for definition in SYSTEM_ROLES:
        for set_key in definition.set_keys:
            assert sets_by_key[set_key].audience is definition.audience, set_key


async def test_registration_assigns_default_role(client: AsyncClient):
    """A self-service registrant holds the default role exactly once."""
    await register_and_verify(client, "registered@test.com")

    async with TestingSessionLocal() as session:
        assert len(await _default_role_holders(session, "registered@test.com")) == 1


async def test_admin_creation_assigns_default_role(client: AsyncClient):
    """An admin provisioned by a superadmin holds the default role."""
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com", root=True)
    await login(client, "root@test.com")

    response = await client.post(
        "/admin/admins",
        json={
            "email": "provisioned@test.com",
            "password": "Password123!",
            "first_name": "P",
            "last_name": "A",
            "permissions": [Permission.USERS_READ.value],
        },
    )
    assert response.status_code == 201, response.text

    async with TestingSessionLocal() as session:
        assert len(await _default_role_holders(session, "provisioned@test.com")) == 1


async def test_first_superadmin_bootstrap_assigns_default_role():
    """The superadmin seeded at startup also holds the default role."""
    with patch.object(bootstrap, "AsyncSessionLocal", new=TestingSessionLocal):
        await bootstrap.ensure_first_superadmin()

    async with TestingSessionLocal() as session:
        seeded = (
            await session.execute(
                select(User).where(User.email == settings.FIRST_SUPERUSER)
            )
        ).scalar_one()
        assert seeded.role == SystemRole.SUPERADMIN.value
        assert len(await _default_role_holders(session, seeded.email)) == 1


async def test_startup_catalog_bootstrap_builds_the_catalog():
    """The startup entry point restores the catalog through its own session."""
    async with TestingSessionLocal() as session:
        await session.execute(delete(RbacRolePermissionSet))
        await session.commit()

    with patch.object(bootstrap, "AsyncSessionLocal", new=TestingSessionLocal):
        await bootstrap.ensure_system_rbac_catalog()

    async with TestingSessionLocal() as session:
        assert await _role_contents(session) == _EXPECTED_ROLES


async def test_user_is_not_created_without_its_default_role():
    """Account and default role commit together: a failure leaves neither."""
    user = User(email="atomic@test.com", hashed_password="x")

    async with TestingSessionLocal() as session:
        with (
            patch(
                "app.repositories.user.assign_default_role",
                new=AsyncMock(side_effect=RuntimeError("boom")),
            ),
            pytest.raises(RuntimeError),
        ):
            await create_user(session, user)
        await session.rollback()

    async with TestingSessionLocal() as session:
        stored = await session.execute(
            select(User).where(User.email == "atomic@test.com")
        )
        assert stored.scalar_one_or_none() is None


async def test_assign_default_role_is_idempotent():
    """Assigning the default role twice keeps a single row."""
    async with TestingSessionLocal() as session:
        user = await create_user(
            session, User(email="twice@test.com", hashed_password="x")
        )
        await rbac_repository.assign_default_role(session, user.id)
        await session.commit()

        assert len(await _default_role_holders(session, "twice@test.com")) == 1


async def test_existing_admin_grants_are_untouched(client: AsyncClient):
    """Direct admin grants survive the catalog and no admin role is added."""
    await register_and_verify(client, "granted@test.com")
    await promote_to_admin("granted@test.com")
    await grant_permissions(
        "granted@test.com", [Permission.USERS_READ, Permission.FILES_DELETE]
    )

    async with TestingSessionLocal() as session:
        await ensure_rbac_catalog(session)
        user_id = (
            await session.execute(
                select(User.id).where(User.email == "granted@test.com")
            )
        ).scalar_one()
        grants = await session.execute(
            select(AdminPermission.permission).where(AdminPermission.user_id == user_id)
        )
        assert set(grants.scalars().all()) == {"users:read", "files:delete"}
        held = await session.execute(
            select(RbacUserRole.role_id).where(RbacUserRole.user_id == user_id)
        )
        assert held.scalars().all() == [DEFAULT_USER_ROLE_ID]


def test_migration_uses_the_catalog_default_role_id():
    """The migration literal stays frozen to the catalog's default role id."""
    assert _load_rbac_migration().DEFAULT_USER_ROLE_ID == str(DEFAULT_USER_ROLE_ID)
