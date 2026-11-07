"""End-to-end RBAC rule coverage: permission gating and superadmin guards.

Role transitions no longer happen on the users surface (admins are created and
deleted as accounts; the superadmin tier is managed root-only on the admins
surface), so this module focuses on per-permission gating and the protection
rules that stop a plain admin from acting on a superadmin.
"""

import asyncio
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import AsyncClient, Response
from sqlalchemy import delete, select, update

from app.core import realtime
from app.core.messages.error_message import ErrorMessages
from app.core.rbac_catalog import DEFAULT_USER_ROLE_KEY
from app.core.security import get_password_hash
from app.models.admin_permission import AdminPermission
from app.models.rbac import (
    RbacPermissionSet,
    RbacRole,
    RbacUserPermissionSet,
    RbacUserRole,
)
from app.models.user import User
from app.repositories.admin.permission import get_user_permissions
from app.repositories.admin.user import is_last_active_superadmin
from app.repositories.user import get_user_by_email, get_user_by_id
from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.user import SystemRole
from app.tests.admin.conftest import (
    get_user_id,
    grant_permissions,
    login,
    promote_to_admin,
    promote_to_superadmin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal
from app.tests.test_rbac_user_routes import POLICY_VIOLATION, AsgiSocket
from app.use_cases import socket_permissions
from app.use_cases.permissions import (
    ensure_can_grant,
    get_effective_permissions,
    invalidate_user_permissions,
)
from app.utils import utc_now

ADMIN_SOCKET_PATH = "/admin/support/ws"

# What the default ``user`` role grants to any account created through the API.
_DEFAULT_ROLE_KEYS = (
    Permission.SELF_PROFILE_UPDATE,
    Permission.SELF_FILES_UPLOAD,
    Permission.SELF_NOTIFICATIONS_READ,
    Permission.SELF_SUPPORT_READ,
    Permission.SELF_SUPPORT_CREATE,
    Permission.SELF_SUPPORT_REPLY,
    Permission.SELF_SUPPORT_CLOSE,
)


async def _make_admin(
    client: AsyncClient, email: str, permissions: list[Permission]
) -> None:
    """Register, promote to admin, grant the given permissions, and log in."""
    await register_and_verify(client, email)
    await promote_to_admin(email)
    if permissions:
        await grant_permissions(email, permissions)
    await login(client, email)


# --- Permission gating ------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_without_grant_is_forbidden(client: AsyncClient):
    """An admin holding no grants is rejected on a gated resource."""
    await _make_admin(client, "nogrants@test.com", [])
    response = await client.get("/admin/users")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS


@pytest.mark.asyncio
async def test_users_read_grant_allows_listing(client: AsyncClient):
    """The users:read grant unlocks exactly the read endpoints."""
    await _make_admin(client, "reader@test.com", [Permission.USERS_READ])
    response = await client.get("/admin/users")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_users_read_does_not_imply_write(client: AsyncClient):
    """A read-only admin cannot mutate a user."""
    await _make_admin(client, "readonly@test.com", [Permission.USERS_READ])
    await register_and_verify(client, "victim@test.com")
    target_id = await get_user_id("victim@test.com")

    response = await client.patch(
        f"/admin/users/{target_id}", json={"first_name": "Nope"}
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS


# --- Role field is rejected on the users surface ----------------------------


@pytest.mark.asyncio
async def test_users_update_rejects_role_field(client: AsyncClient):
    """The users update payload no longer accepts a role field (422)."""
    await _make_admin(client, "writer@test.com", [Permission.USERS_WRITE])
    await register_and_verify(client, "rolesubject@test.com")
    target_id = await get_user_id("rolesubject@test.com")

    response = await client.patch(
        f"/admin/users/{target_id}", json={"role": SystemRole.ADMIN.value}
    )
    assert response.status_code == 422


# --- Superadmin protection (plain admin acting on a superadmin) --------------


@pytest.mark.asyncio
async def test_plain_admin_cannot_modify_superadmin(client: AsyncClient):
    """A plain admin cannot edit a superadmin even with users:write."""
    await _make_admin(client, "edituser@test.com", [Permission.USERS_WRITE])
    await register_and_verify(client, "thesuper@test.com")
    await promote_to_superadmin("thesuper@test.com")
    target_id = await get_user_id("thesuper@test.com")

    response = await client.patch(
        f"/admin/users/{target_id}", json={"first_name": "Hijack"}
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN


@pytest.mark.asyncio
async def test_plain_admin_cannot_delete_superadmin(client: AsyncClient):
    """A plain admin cannot delete a superadmin even with users:delete."""
    await _make_admin(client, "deleter@test.com", [Permission.USERS_DELETE])
    await register_and_verify(client, "super-target@test.com")
    await promote_to_superadmin("super-target@test.com")
    target_id = await get_user_id("super-target@test.com")

    response = await client.delete(f"/admin/users/{target_id}")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN


@pytest.mark.asyncio
async def test_plain_admin_cannot_reset_superadmin_password(client: AsyncClient):
    """A plain admin cannot force-reset a superadmin's password."""
    await _make_admin(client, "resetter@test.com", [Permission.USERS_PASSWORD_RESET])
    await register_and_verify(client, "super-pw@test.com")
    await promote_to_superadmin("super-pw@test.com")
    target_id = await get_user_id("super-pw@test.com")

    response = await client.post(f"/admin/users/{target_id}/change-password")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN


# --- /users/me permission visibility ----------------------------------------


@pytest.mark.asyncio
async def test_me_lists_only_self_permissions_for_regular_user(client: AsyncClient):
    """A regular user receives its self-service keys and no admin key."""
    await register_and_verify(client, "plain@test.com")
    await login(client, "plain@test.com")
    body = (await client.get("/users/me")).json()
    assert body["permissions"] == sorted(key.value for key in _DEFAULT_ROLE_KEYS)


@pytest.mark.asyncio
async def test_me_exposes_grants_for_admin(client: AsyncClient):
    """A plain admin sees exactly their grants plus the default role's keys."""
    await _make_admin(client, "meadmin@test.com", [Permission.STATS_READ])
    body = (await client.get("/users/me")).json()
    assert body["permissions"] == sorted(
        key.value for key in (Permission.STATS_READ, *_DEFAULT_ROLE_KEYS)
    )


@pytest.mark.asyncio
async def test_me_hides_permissions_for_superadmin(superadmin_client: AsyncClient):
    """A superadmin gets no permissions list — their role implies everything."""
    body = (await superadmin_client.get("/users/me")).json()
    assert "permissions" not in body


# --- Repository guard -------------------------------------------------------


@pytest.mark.asyncio
async def test_is_last_active_superadmin_repository():
    """The repo flags the sole remaining active superadmin."""
    async with TestingSessionLocal() as session:
        only_super = User(
            email="solo-super@test.com",
            hashed_password=get_password_hash("Password123!"),
            role=SystemRole.SUPERADMIN.value,
            is_active=True,
            is_verified=True,
        )
        other_super = User(
            email="second-super@test.com",
            hashed_password=get_password_hash("Password123!"),
            role=SystemRole.SUPERADMIN.value,
            is_active=True,
            is_verified=True,
        )
        session.add(only_super)
        await session.commit()
        await session.refresh(only_super)

        assert await is_last_active_superadmin(session, only_super.id) is True

        session.add(other_super)
        await session.commit()

        assert await is_last_active_superadmin(session, only_super.id) is False


# --- Delegated admin management ---------------------------------------------


async def _seed_target(
    client: AsyncClient, email: str, permissions: list[Permission] | None = None
) -> str:
    """Create a plain admin to act on, optionally with direct grants; return its id."""
    await register_and_verify(client, email)
    await promote_to_admin(email)
    if permissions:
        await grant_permissions(email, permissions)
    return await get_user_id(email)


async def _seed_superadmin(client: AsyncClient, email: str) -> str:
    """Create a superadmin to act on and return its id."""
    await register_and_verify(client, email)
    await promote_to_superadmin(email)
    return await get_user_id(email)


async def _direct_grants(user_id: str) -> set[Permission]:
    """Return the direct grants stored for an account."""
    async with TestingSessionLocal() as session:
        return set(await get_user_permissions(session, uuid.UUID(user_id)))


async def _account_exists(user_id: str) -> bool:
    """Return whether the account is still stored."""
    async with TestingSessionLocal() as session:
        return await get_user_by_id(session, uuid.UUID(user_id)) is not None


async def _load_account(email: str) -> User:
    """Return a stored account by its email."""
    async with TestingSessionLocal() as session:
        user = await get_user_by_email(session, email)
    assert user is not None
    return user


def _new_admin_body(email: str, permissions: list[Permission]) -> dict:
    """Build the create-admin payload for the given keys."""
    return {
        "email": email,
        "password": "Password123!",
        "permissions": [permission.value for permission in permissions],
    }


@pytest.mark.asyncio
async def test_admins_read_lists_without_being_able_to_modify(client: AsyncClient):
    """``admins:read`` opens the list and catalog, and no mutation."""
    target_id = await _seed_target(client, "listed@test.com")
    await _make_admin(client, "admin-reader@test.com", [Permission.ADMINS_READ])

    listing = await client.get("/admin/admins")
    assert listing.status_code == 200
    assert target_id in {row["id"] for row in listing.json()["data"]}
    assert (await client.get("/admin/admins/permissions")).status_code == 200

    refusals = [
        await client.post(
            "/admin/admins", json=_new_admin_body("reader-made@test.com", [])
        ),
        await client.patch(
            f"/admin/admins/{target_id}/permissions", json={"permissions": []}
        ),
        await client.delete(f"/admin/admins/{target_id}"),
    ]
    for response in refusals:
        assert response.status_code == 403
        assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS
    assert await _account_exists(target_id)


@pytest.mark.asyncio
async def test_admin_without_admins_read_cannot_list(client: AsyncClient):
    """No admin key means no list and no catalog."""
    await _make_admin(client, "no-admins-key@test.com", [Permission.USERS_READ])
    assert (await client.get("/admin/admins")).status_code == 403
    assert (await client.get("/admin/admins/permissions")).status_code == 403


@pytest.mark.asyncio
async def test_admins_write_does_not_imply_delete(client: AsyncClient):
    """Deleting an admin takes its own key."""
    target_id = await _seed_target(client, "kept@test.com")
    await _make_admin(client, "admin-writer@test.com", [Permission.ADMINS_WRITE])

    response = await client.delete(f"/admin/admins/{target_id}")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS


@pytest.mark.asyncio
async def test_admins_delete_does_not_imply_write(client: AsyncClient):
    """Changing grants takes its own key."""
    target_id = await _seed_target(client, "unchanged@test.com")
    await _make_admin(client, "admin-deleter@test.com", [Permission.ADMINS_DELETE])

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions", json={"permissions": []}
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS


@pytest.mark.asyncio
async def test_delegated_admin_cannot_modify_superadmin(client: AsyncClient):
    """No grant lets a delegated admin change a superadmin's grants."""
    target_id = await _seed_superadmin(client, "untouchable@test.com")
    await _make_admin(client, "bold-writer@test.com", [Permission.ADMINS_WRITE])

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions", json={"permissions": []}
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN


@pytest.mark.asyncio
async def test_delegated_admin_cannot_delete_superadmin(client: AsyncClient):
    """No grant lets a delegated admin delete a superadmin, and the refusal says why."""
    target_id = await _seed_superadmin(client, "undeletable@test.com")
    await _make_admin(client, "bold-deleter@test.com", [Permission.ADMINS_DELETE])

    response = await client.delete(f"/admin/admins/{target_id}")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN
    assert await _account_exists(target_id)


@pytest.mark.asyncio
async def test_delegated_admin_cannot_grant_a_key_it_lacks(client: AsyncClient):
    """Holding ``admins:write`` is not enough to hand out any other key."""
    target_id = await _seed_target(client, "grantee@test.com")
    await _make_admin(client, "limited-writer@test.com", [Permission.ADMINS_WRITE])

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={"permissions": [Permission.SYSTEM_SETTINGS_WRITE.value]},
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.RBAC_PRIVILEGE_ESCALATION
    assert await _direct_grants(target_id) == set()


@pytest.mark.asyncio
async def test_delegated_admin_grants_a_key_it_holds(client: AsyncClient):
    """A held key can be handed on."""
    target_id = await _seed_target(client, "grantee2@test.com")
    await _make_admin(
        client,
        "able-writer@test.com",
        [Permission.ADMINS_WRITE, Permission.USERS_READ],
    )

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={"permissions": [Permission.USERS_READ.value]},
    )
    assert response.status_code == 200, response.text
    assert await _direct_grants(target_id) == {Permission.USERS_READ}


@pytest.mark.asyncio
async def test_delegated_admin_keeps_a_targets_key_it_lacks(client: AsyncClient):
    """Resubmitting a key the target already has grants nothing new."""
    target_id = await _seed_target(client, "richer@test.com", [Permission.FILES_READ])
    await _make_admin(
        client,
        "poorer-writer@test.com",
        [Permission.ADMINS_WRITE, Permission.USERS_READ],
    )

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={
            "permissions": [Permission.FILES_READ.value, Permission.USERS_READ.value]
        },
    )
    assert response.status_code == 200, response.text
    assert await _direct_grants(target_id) == {
        Permission.FILES_READ,
        Permission.USERS_READ,
    }


@pytest.mark.asyncio
async def test_delegated_admin_cannot_revoke_a_key_it_lacks(client: AsyncClient):
    """A delegated admin only changes keys inside its own scope."""
    target_id = await _seed_target(client, "stripped@test.com", [Permission.FILES_READ])
    await _make_admin(client, "stripper@test.com", [Permission.ADMINS_WRITE])

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions", json={"permissions": []}
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.RBAC_PRIVILEGE_ESCALATION
    assert await _direct_grants(target_id) == {Permission.FILES_READ}


@pytest.mark.asyncio
async def test_delegated_admin_cannot_create_with_a_key_it_lacks(client: AsyncClient):
    """Creating an admin cannot hand out more than the creator holds."""
    await _make_admin(client, "limited-creator@test.com", [Permission.ADMINS_WRITE])

    response = await client.post(
        "/admin/admins",
        json=_new_admin_body("too-strong@test.com", [Permission.USERS_DELETE]),
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.RBAC_PRIVILEGE_ESCALATION
    async with TestingSessionLocal() as session:
        assert await get_user_by_email(session, "too-strong@test.com") is None


@pytest.mark.asyncio
async def test_escalating_create_does_not_reveal_a_taken_email(client: AsyncClient):
    """The escalation refusal comes first, whether or not the email exists."""
    await register_and_verify(client, "taken-probe@test.com")
    await _make_admin(client, "prober@test.com", [Permission.ADMINS_WRITE])

    response = await client.post(
        "/admin/admins",
        json=_new_admin_body("taken-probe@test.com", [Permission.USERS_DELETE]),
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.RBAC_PRIVILEGE_ESCALATION


@pytest.mark.asyncio
async def test_delegated_admin_creates_a_plain_admin_with_held_keys(
    client: AsyncClient,
):
    """A created account is a plain admin holding exactly the requested keys."""
    await _make_admin(
        client,
        "able-creator@test.com",
        [Permission.ADMINS_WRITE, Permission.USERS_READ],
    )

    response = await client.post(
        "/admin/admins",
        json=_new_admin_body("junior@test.com", [Permission.USERS_READ]),
    )
    assert response.status_code == 201, response.text
    assert response.json()["admin"]["role"] == SystemRole.ADMIN.value
    assert response.json()["admin"]["is_root_superadmin"] is False
    created_id = response.json()["admin"]["id"]
    assert await _direct_grants(created_id) == {Permission.USERS_READ}


@pytest.mark.asyncio
async def test_delegated_admin_cannot_change_its_own_grants(client: AsyncClient):
    """Editing itself could turn a temporary key into a permanent direct grant."""
    await _make_admin(client, "self-editor@test.com", [Permission.ADMINS_WRITE])
    own_id = await get_user_id("self-editor@test.com")

    response = await client.patch(
        f"/admin/admins/{own_id}/permissions",
        json={"permissions": [Permission.ADMINS_WRITE.value]},
    )
    assert response.status_code == 400
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SELF


@pytest.mark.asyncio
async def test_delegated_admin_cannot_delete_itself(client: AsyncClient):
    """Self-deletion stays refused, even when another admin would remain."""
    await _seed_target(client, "other-admin@test.com")
    await _make_admin(client, "self-deleter@test.com", [Permission.ADMINS_DELETE])
    own_id = await get_user_id("self-deleter@test.com")

    response = await client.delete(f"/admin/admins/{own_id}")
    assert response.status_code == 400
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_DELETE_SELF
    assert await _account_exists(own_id)


@pytest.mark.asyncio
async def test_delegated_admin_deletes_a_plain_admin(client: AsyncClient):
    """``admins:delete`` removes another plain admin."""
    target_id = await _seed_target(client, "removable@test.com")
    await _make_admin(client, "able-deleter@test.com", [Permission.ADMINS_DELETE])

    response = await client.delete(f"/admin/admins/{target_id}")
    assert response.status_code == 200, response.text
    assert not await _account_exists(target_id)


@pytest.mark.asyncio
async def test_last_admin_guard_applies_to_a_delegated_actor(client: AsyncClient):
    """The last-admin guard still runs on the path a delegated admin takes."""
    target_id = await _seed_target(client, "last-standing@test.com")
    await _make_admin(client, "guarded-deleter@test.com", [Permission.ADMINS_DELETE])

    with patch(
        "app.services.admin.admin_service.is_last_active_admin",
        AsyncMock(return_value=True),
    ):
        response = await client.delete(f"/admin/admins/{target_id}")
    assert response.status_code == 400
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_DELETE_LAST_ADMIN
    assert await _account_exists(target_id)


@pytest.mark.asyncio
@pytest.mark.parametrize("action", ["promote", "demote"])
async def test_tier_routes_stay_refused_to_a_fully_delegated_admin(
    client: AsyncClient, action: str
):
    """Every key together still does not open the superadmin tier."""
    target_id = await _seed_target(client, f"tier-{action}@test.com")
    await _make_admin(client, f"delegate-{action}@test.com", list(Permission))

    response = await client.post(f"/admin/admins/{target_id}/{action}")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ONLY_SUPERADMIN_ALLOWED


@pytest.mark.asyncio
async def test_root_transfer_stays_refused_to_a_fully_delegated_admin(
    client: AsyncClient,
):
    """Every key together still does not open the root transfer."""
    target_id = await _seed_superadmin(client, "would-be-root@test.com")
    await _make_admin(client, "delegate-root@test.com", list(Permission))

    responses = [
        await client.post("/admin/admins/transfer-root", json={"user_id": target_id}),
        await client.post(
            "/admin/admins/transfer-root/confirm", json={"code": "123456"}
        ),
    ]
    for response in responses:
        assert response.status_code == 403
        assert response.json()["error"] == ErrorMessages.ONLY_SUPERADMIN_ALLOWED


@pytest.mark.asyncio
async def test_permission_change_reaches_the_target_at_once(client: AsyncClient):
    """A delegated change invalidates the target's cached permissions."""
    target_id = await _seed_target(client, "cached@test.com", [Permission.USERS_READ])
    target = await _load_account("cached@test.com")
    async with TestingSessionLocal() as session:
        assert Permission.USERS_READ in await get_effective_permissions(session, target)
    await _make_admin(
        client,
        "revoker@test.com",
        [Permission.ADMINS_WRITE, Permission.USERS_READ],
    )

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={"permissions": []},
    )
    assert response.status_code == 200, response.text
    async with TestingSessionLocal() as session:
        assert Permission.USERS_READ not in await get_effective_permissions(
            session, target
        )


# --- ensure_can_grant --------------------------------------------------------


@pytest.mark.asyncio
async def test_ensure_can_grant_lets_a_superadmin_grant_anything(client: AsyncClient):
    """A superadmin holds every key."""
    await _seed_superadmin(client, "all-keys@test.com")
    actor = await _load_account("all-keys@test.com")
    async with TestingSessionLocal() as session:
        await ensure_can_grant(session, actor, list(Permission))


@pytest.mark.asyncio
async def test_ensure_can_grant_ignores_a_stale_cache(client: AsyncClient):
    """A key still in the cache but gone from the database cannot be handed out."""
    await _seed_target(client, "stale@test.com", [Permission.USERS_READ])
    actor = await _load_account("stale@test.com")
    async with TestingSessionLocal() as session:
        assert Permission.USERS_READ in await get_effective_permissions(session, actor)
    async with TestingSessionLocal() as session:
        await session.execute(
            delete(AdminPermission).where(AdminPermission.user_id == actor.id)
        )
        await session.commit()

    async with TestingSessionLocal() as session:
        with pytest.raises(HTTPException) as refused:
            await ensure_can_grant(session, actor, [Permission.USERS_READ])
    assert refused.value.status_code == 403
    assert refused.value.detail == ErrorMessages.RBAC_PRIVILEGE_ESCALATION


@pytest.mark.asyncio
async def test_ensure_can_grant_ignores_grants_outside_the_tier(client: AsyncClient):
    """A regular account whose admin grant rows linger cannot hand them out."""
    await register_and_verify(client, "lingering@test.com")
    await grant_permissions("lingering@test.com", [Permission.USERS_READ])
    actor = await _load_account("lingering@test.com")

    async with TestingSessionLocal() as session:
        with pytest.raises(HTTPException) as refused:
            await ensure_can_grant(session, actor, [Permission.USERS_READ])
    assert refused.value.status_code == 403


@pytest.mark.asyncio
async def test_ensure_can_grant_accepts_nothing_to_grant(client: AsyncClient):
    """An empty set is always allowed, whatever the actor holds."""
    await _seed_target(client, "empty-handed@test.com")
    actor = await _load_account("empty-handed@test.com")
    async with TestingSessionLocal() as session:
        await ensure_can_grant(session, actor, [])


# --- Admin support socket -----------------------------------------------------


@pytest_asyncio.fixture
async def admin_socket_bus(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    """Run the Redis to socket bridge, with the watcher on the test database."""
    monkeypatch.setattr(socket_permissions, "AsyncSessionLocal", TestingSessionLocal)
    await realtime.start_realtime()
    await asyncio.sleep(0.1)
    try:
        yield
    finally:
        await realtime.stop_realtime()


async def _open_admin_socket(email: str) -> AsgiSocket:
    """Open the admin support socket for an account and let its watch settle."""
    user_id = uuid.UUID(await get_user_id(email))
    socket = AsgiSocket(ADMIN_SOCKET_PATH, user_id)
    assert (await socket.handshake())["type"] == "websocket.accept"
    await asyncio.sleep(0.1)
    return socket


async def _expect_policy_close(socket: AsgiSocket) -> None:
    """Assert the server closes the socket on policy grounds, then unwind it."""
    message = await socket.next_message()
    assert message["type"] == "websocket.close"
    assert message["code"] == POLICY_VIOLATION
    await socket.leave()


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
async def test_admin_socket_handshake_requires_support_read(client: AsyncClient):
    """An admin without ``support:read`` never gets the socket."""
    await _seed_target(client, "no-support@test.com", [Permission.USERS_READ])
    user_id = uuid.UUID(await get_user_id("no-support@test.com"))

    socket = AsgiSocket(ADMIN_SOCKET_PATH, user_id)
    answer = await socket.handshake()
    assert answer["type"] == "websocket.close"
    assert answer["code"] == POLICY_VIOLATION
    await socket.leave()


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
async def test_admin_socket_survives_a_change_keeping_support_read(
    superadmin_client: AsyncClient,
):
    """Only losing the key closes the socket, not any permission change."""
    target_id = await _seed_target(
        superadmin_client, "keeps-support@test.com", [Permission.SUPPORT_READ]
    )
    socket = await _open_admin_socket("keeps-support@test.com")

    response = await superadmin_client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={
            "permissions": [Permission.SUPPORT_READ.value, Permission.STATS_READ.value]
        },
    )
    assert response.status_code == 200, response.text

    await asyncio.sleep(0.3)
    assert socket.has_no_message()
    await socket.leave()


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
async def test_admin_socket_closes_when_support_read_is_revoked(
    superadmin_client: AsyncClient,
):
    """Withdrawing ``support:read`` through the API closes the open socket."""
    target_id = await _seed_target(
        superadmin_client,
        "loses-support@test.com",
        [Permission.SUPPORT_READ, Permission.STATS_READ],
    )
    socket = await _open_admin_socket("loses-support@test.com")

    # A key stays: this is the only admin, whose last access cannot be withdrawn.
    response = await superadmin_client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={"permissions": [Permission.STATS_READ.value]},
    )
    assert response.status_code == 200, response.text

    await _expect_policy_close(socket)


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
async def test_admin_socket_closes_when_superadmin_is_demoted(
    superadmin_client: AsyncClient,
):
    """A demoted superadmin holds no grant anymore, so its open socket closes."""
    target_id = await _seed_superadmin(superadmin_client, "demoted@test.com")
    socket = await _open_admin_socket("demoted@test.com")

    response = await superadmin_client.post(f"/admin/admins/{target_id}/demote")
    assert response.status_code == 200, response.text

    await _expect_policy_close(socket)


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
async def test_admin_socket_closes_when_the_account_is_deleted(
    superadmin_client: AsyncClient,
):
    """A deleted admin does not keep following the ticket queue."""
    await _seed_target(superadmin_client, "keeps-quorum@test.com")
    target_id = await _seed_target(
        superadmin_client, "deleted-live@test.com", [Permission.SUPPORT_READ]
    )
    socket = await _open_admin_socket("deleted-live@test.com")

    response = await superadmin_client.delete(f"/admin/admins/{target_id}")
    assert response.status_code == 200, response.text

    await _expect_policy_close(socket)


# --- Only permanently held keys can be handed out -------------------------------


async def _assign_role(
    email: str, role_key: str, *, expires_at: datetime | None = None
) -> None:
    """Add one catalog role to an account, optionally until a date."""
    user_id = uuid.UUID(await get_user_id(email))
    async with TestingSessionLocal() as session:
        stmt = select(RbacRole.id).where(RbacRole.key == role_key)
        role_id = (await session.execute(stmt)).scalar_one()
        session.add(
            RbacUserRole(user_id=user_id, role_id=role_id, expires_at=expires_at)
        )
        await session.commit()
    await invalidate_user_permissions(user_id)


async def _assign_set(
    email: str, set_key: str, *, expires_at: datetime | None = None
) -> None:
    """Add one catalog set to an account, optionally until a date."""
    user_id = uuid.UUID(await get_user_id(email))
    async with TestingSessionLocal() as session:
        stmt = select(RbacPermissionSet.id).where(RbacPermissionSet.key == set_key)
        set_id = (await session.execute(stmt)).scalar_one()
        session.add(
            RbacUserPermissionSet(user_id=user_id, set_id=set_id, expires_at=expires_at)
        )
        await session.commit()
    await invalidate_user_permissions(user_id)


def _in_an_hour() -> datetime:
    """Return a date that keeps an assignment valid during the test."""
    return utc_now() + timedelta(hours=1)


@pytest.mark.asyncio
@pytest.mark.parametrize("via", ["role", "set"])
async def test_temporary_key_cannot_be_passed_on_at_creation(
    client: AsyncClient, via: str
):
    """A sock-puppet account must not outlive the creator's expiring key."""
    await _make_admin(client, f"temp-creator-{via}@test.com", [Permission.ADMINS_WRITE])
    if via == "role":
        await _assign_role(
            f"temp-creator-{via}@test.com", "support_agent", expires_at=_in_an_hour()
        )
    else:
        await _assign_set(
            f"temp-creator-{via}@test.com", "support.agent", expires_at=_in_an_hour()
        )
    assert (
        Permission.SUPPORT_READ.value
        in (await client.get("/users/me")).json()["permissions"]
    )

    response = await client.post(
        "/admin/admins",
        json=_new_admin_body(f"puppet-{via}@test.com", [Permission.SUPPORT_READ]),
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.RBAC_PRIVILEGE_ESCALATION


@pytest.mark.asyncio
async def test_temporary_key_cannot_be_passed_on_to_a_peer(client: AsyncClient):
    """A peer cannot be used to keep a key that is about to expire."""
    target_id = await _seed_target(client, "accomplice@test.com")
    await _make_admin(client, "temp-granter@test.com", [Permission.ADMINS_WRITE])
    await _assign_role(
        "temp-granter@test.com", "support_agent", expires_at=_in_an_hour()
    )

    response = await client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={"permissions": [Permission.SUPPORT_READ.value]},
    )
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.RBAC_PRIVILEGE_ESCALATION
    assert await _direct_grants(target_id) == set()


@pytest.mark.asyncio
@pytest.mark.parametrize("via", ["role", "set"])
async def test_permanent_assignment_can_be_passed_on(client: AsyncClient, via: str):
    """A key held without an end date counts, whichever way it is assigned."""
    target_id = await _seed_target(client, f"beneficiary-{via}@test.com")
    await _make_admin(client, f"perm-granter-{via}@test.com", [Permission.ADMINS_WRITE])
    if via == "role":
        await _assign_role(f"perm-granter-{via}@test.com", "support_agent")
    else:
        await _assign_set(f"perm-granter-{via}@test.com", "support.agent")

    patched = await client.patch(
        f"/admin/admins/{target_id}/permissions",
        json={"permissions": [Permission.SUPPORT_READ.value]},
    )
    assert patched.status_code == 200, patched.text

    created = await client.post(
        "/admin/admins",
        json=_new_admin_body(f"recruit-{via}@test.com", [Permission.SUPPORT_READ]),
    )
    assert created.status_code == 201, created.text


@pytest.mark.asyncio
async def test_temporary_admins_write_still_opens_the_route(client: AsyncClient):
    """Route gates keep reading effective keys: only passing a key on is stricter."""
    await _make_admin(client, "temp-admin-writer@test.com", [])
    await _assign_set(
        "temp-admin-writer@test.com", "rbac.manage", expires_at=_in_an_hour()
    )

    response = await client.post(
        "/admin/admins", json=_new_admin_body("keyless@test.com", [])
    )
    assert response.status_code == 201, response.text


# --- users:* keys do not reach further than admins:* on a plain admin -----------


_USER_ROUTES_ON_ACCOUNTS = [
    pytest.param(
        "DELETE",
        "",
        Permission.USERS_DELETE,
        Permission.ADMINS_DELETE,
        None,
        id="delete",
    ),
    pytest.param(
        "POST",
        "/change-password",
        Permission.USERS_PASSWORD_RESET,
        Permission.ADMINS_WRITE,
        None,
        id="password",
    ),
    pytest.param(
        "POST",
        "/suspend",
        Permission.USERS_SUSPEND,
        Permission.ADMINS_WRITE,
        None,
        id="suspend",
    ),
    pytest.param(
        "POST",
        "/unsuspend",
        Permission.USERS_SUSPEND,
        Permission.ADMINS_WRITE,
        None,
        id="unsuspend",
    ),
    pytest.param(
        "POST",
        "/unlock",
        Permission.USERS_UNLOCK,
        Permission.ADMINS_WRITE,
        None,
        id="unlock",
    ),
    pytest.param(
        "POST",
        "/mfa/reset",
        Permission.USERS_MFA_RESET,
        Permission.ADMINS_WRITE,
        None,
        id="mfa",
    ),
    pytest.param(
        "DELETE",
        "/sessions",
        Permission.USERS_SESSIONS,
        Permission.ADMINS_WRITE,
        None,
        id="sessions",
    ),
    pytest.param(
        "PATCH",
        "",
        Permission.USERS_WRITE,
        Permission.ADMINS_WRITE,
        {"is_active": False},
        id="deactivate",
    ),
    pytest.param(
        "PATCH",
        "",
        Permission.USERS_WRITE,
        Permission.ADMINS_WRITE,
        {"is_verified": False},
        id="unverify",
    ),
    pytest.param(
        "PATCH",
        "",
        Permission.USERS_WRITE,
        Permission.ADMINS_WRITE,
        {"first_name": "Renamed"},
        id="profile",
    ),
]


async def _prepare_target(user_id: str, path: str) -> None:
    """Put the account in the state the route needs: suspended for an unsuspend."""
    if path != "/unsuspend":
        return
    async with TestingSessionLocal() as session:
        await session.execute(
            update(User)
            .where(User.id == uuid.UUID(user_id))
            .values(is_active=False, suspended_at=utc_now())
        )
        await session.commit()


async def _call_user_route(
    client: AsyncClient, method: str, user_id: str, path: str, body: dict | None
) -> Response:
    """Call an ``/admin/users`` mutation."""
    kwargs = {} if body is None else {"json": body}
    return await client.request(method, f"/admin/users/{user_id}{path}", **kwargs)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path", "user_key", "_admin_key", "body"), _USER_ROUTES_ON_ACCOUNTS
)
async def test_user_key_alone_does_not_reach_a_plain_admin(
    client: AsyncClient,
    method: str,
    path: str,
    user_key: Permission,
    _admin_key: Permission,
    body: dict | None,
):
    """A ``users:*`` key is not enough once the target is an admin."""
    target_id = await _seed_target(client, "stronger@test.com")
    await _prepare_target(target_id, path)
    await _make_admin(client, "users-only@test.com", [user_key])

    response = await _call_user_route(client, method, target_id, path, body)

    assert response.status_code == 403, response.text
    assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS
    assert await _account_exists(target_id)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path", "user_key", "admin_key", "body"), _USER_ROUTES_ON_ACCOUNTS
)
async def test_user_key_with_the_admin_key_reaches_a_plain_admin(
    client: AsyncClient,
    method: str,
    path: str,
    user_key: Permission,
    admin_key: Permission,
    body: dict | None,
):
    """Holding the matching ``admins:*`` key as well opens the action."""
    target_id = await _seed_target(client, "peer@test.com")
    await _prepare_target(target_id, path)
    await _make_admin(client, "both-keys@test.com", [user_key, admin_key])

    response = await _call_user_route(client, method, target_id, path, body)

    assert response.status_code == 200, response.text


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path", "user_key", "_admin_key", "body"), _USER_ROUTES_ON_ACCOUNTS
)
async def test_user_key_alone_still_reaches_a_regular_account(
    client: AsyncClient,
    method: str,
    path: str,
    user_key: Permission,
    _admin_key: Permission,
    body: dict | None,
):
    """The extra requirement only concerns admin targets."""
    await register_and_verify(client, "regular-target@test.com")
    target_id = await get_user_id("regular-target@test.com")
    await _prepare_target(target_id, path)
    await _make_admin(client, "users-manager@test.com", [user_key])

    response = await _call_user_route(client, method, target_id, path, body)

    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_delete_through_users_takes_admins_delete_not_admins_write(
    client: AsyncClient,
):
    """The delete keeps its own key on this surface too."""
    target_id = await _seed_target(client, "still-here@test.com")
    await _make_admin(
        client, "wrong-key@test.com", [Permission.USERS_DELETE, Permission.ADMINS_WRITE]
    )

    response = await client.delete(f"/admin/users/{target_id}")

    assert response.status_code == 403
    assert await _account_exists(target_id)


@pytest.mark.asyncio
async def test_admin_key_on_user_routes_is_read_past_the_cache(client: AsyncClient):
    """An ``admins:*`` key just withdrawn does not survive in a stale cache entry."""
    target_id = await _seed_target(client, "protected@test.com")
    await _make_admin(
        client,
        "losing-key@test.com",
        [Permission.USERS_DELETE, Permission.ADMINS_DELETE],
    )
    actor = await _load_account("losing-key@test.com")
    async with TestingSessionLocal() as session:
        await get_effective_permissions(session, actor)
        await session.execute(
            delete(AdminPermission).where(
                AdminPermission.user_id == actor.id,
                AdminPermission.permission == Permission.ADMINS_DELETE.value,
            )
        )
        await session.commit()

    response = await client.delete(f"/admin/users/{target_id}")

    assert response.status_code == 403
    assert await _account_exists(target_id)


@pytest.mark.asyncio
async def test_delegated_admin_cannot_unsuspend_a_superadmin(client: AsyncClient):
    """A suspended superadmin stays suspended whatever keys the actor holds."""
    target_id = await _seed_superadmin(client, "suspended-super@test.com")
    await _prepare_target(target_id, "/unsuspend")
    await _make_admin(
        client,
        "reinstater@test.com",
        [Permission.USERS_SUSPEND, Permission.ADMINS_WRITE],
    )

    response = await client.post(f"/admin/users/{target_id}/unsuspend")

    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN
    target = await _load_account("suspended-super@test.com")
    assert target.suspended_at is not None
    assert target.is_active is False


@pytest.mark.asyncio
async def test_delegated_admin_cannot_revoke_a_superadmins_sessions(
    client: AsyncClient,
):
    """The sessions surface uses the shared superadmin guard."""
    target_id = await _seed_superadmin(client, "sessions-super@test.com")
    await _make_admin(
        client,
        "session-revoker@test.com",
        [Permission.USERS_SESSIONS, Permission.ADMINS_WRITE],
    )

    response = await client.delete(f"/admin/users/{target_id}/sessions")

    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        pytest.param("DELETE", "", None, id="delete"),
        pytest.param("POST", "/suspend", None, id="suspend"),
        pytest.param("PATCH", "", {"is_active": False}, id="deactivate"),
    ],
)
async def test_admin_socket_closes_when_cut_off_through_the_users_surface(
    superadmin_client: AsyncClient, method: str, path: str, body: dict | None
):
    """Deleting or disabling an account closes its open socket at once."""
    await _seed_target(superadmin_client, "second-admin@test.com")
    target_id = await _seed_target(
        superadmin_client, "cut-off@test.com", [Permission.SUPPORT_READ]
    )
    socket = await _open_admin_socket("cut-off@test.com")

    response = await _call_user_route(superadmin_client, method, target_id, path, body)
    assert response.status_code == 200, response.text

    await _expect_policy_close(socket)


# --- Promotion and demotion strip the admin-audience assignments -----------------


async def _assigned_role_keys(email: str) -> set[str]:
    """Return the keys of the roles assigned to an account."""
    user_id = uuid.UUID(await get_user_id(email))
    stmt = (
        select(RbacRole.key)
        .join(RbacUserRole, RbacUserRole.role_id == RbacRole.id)
        .where(RbacUserRole.user_id == user_id)
    )
    async with TestingSessionLocal() as session:
        return set((await session.execute(stmt)).scalars())


async def _assigned_set_keys(email: str) -> set[str]:
    """Return the keys of the sets assigned directly to an account."""
    user_id = uuid.UUID(await get_user_id(email))
    stmt = (
        select(RbacPermissionSet.key)
        .join(
            RbacUserPermissionSet, RbacUserPermissionSet.set_id == RbacPermissionSet.id
        )
        .where(RbacUserPermissionSet.user_id == user_id)
    )
    async with TestingSessionLocal() as session:
        return set((await session.execute(stmt)).scalars())


async def _load_effective_from_cache(email: str) -> set[Permission]:
    """Return an account's effective keys through the cached read."""
    account = await _load_account(email)
    async with TestingSessionLocal() as session:
        return await get_effective_permissions(session, account)


@pytest.mark.asyncio
async def test_demotion_strips_admin_assignments_and_keeps_user_ones(
    superadmin_client: AsyncClient,
):
    """A demoted account keeps no admin key, whichever way it was assigned."""
    target_id = await _seed_superadmin(superadmin_client, "fallen@test.com")
    await _assign_role("fallen@test.com", "support_agent")
    await _assign_set("fallen@test.com", "files.manage")
    await _assign_set("fallen@test.com", "self.readonly")

    response = await superadmin_client.post(f"/admin/admins/{target_id}/demote")
    assert response.status_code == 200, response.text

    assert await _assigned_role_keys("fallen@test.com") == {DEFAULT_USER_ROLE_KEY}
    assert await _assigned_set_keys("fallen@test.com") == {"self.readonly"}
    effective = await _load_effective_from_cache("fallen@test.com")
    assert not {key for key in effective if not is_self_permission(key)}


@pytest.mark.asyncio
async def test_promotion_strips_admin_assignments_and_keeps_user_ones(
    superadmin_client: AsyncClient,
):
    """Nothing is left over to resurface if the account is demoted later."""
    target_id = await _seed_target(superadmin_client, "risen@test.com")
    await _assign_role("risen@test.com", "support_agent")
    await _assign_set("risen@test.com", "files.manage")
    await _assign_set("risen@test.com", "self.readonly")

    response = await superadmin_client.post(f"/admin/admins/{target_id}/promote")
    assert response.status_code == 200, response.text

    assert await _assigned_role_keys("risen@test.com") == {DEFAULT_USER_ROLE_KEY}
    assert await _assigned_set_keys("risen@test.com") == {"self.readonly"}

    demoted = await superadmin_client.post(f"/admin/admins/{target_id}/demote")
    assert demoted.status_code == 200, demoted.text
    effective = await _load_effective_from_cache("risen@test.com")
    assert not {key for key in effective if not is_self_permission(key)}


@pytest.mark.asyncio
async def test_demotion_invalidates_a_cached_admin_key(superadmin_client: AsyncClient):
    """A key cached while the account was an admin dies with the demotion."""
    target_id = await _seed_target(superadmin_client, "cached-fall@test.com")
    await _assign_role("cached-fall@test.com", "support_agent")
    assert Permission.SUPPORT_READ in await _load_effective_from_cache(
        "cached-fall@test.com"
    )
    await promote_to_superadmin("cached-fall@test.com")

    response = await superadmin_client.post(f"/admin/admins/{target_id}/demote")
    assert response.status_code == 200, response.text

    assert Permission.SUPPORT_READ not in await _load_effective_from_cache(
        "cached-fall@test.com"
    )


@pytest.mark.asyncio
@pytest.mark.usefixtures("admin_socket_bus")
async def test_admin_socket_closes_when_demoted_despite_an_admin_role(
    superadmin_client: AsyncClient,
):
    """A role carrying ``support:read`` does not keep a demoted account's socket."""
    target_id = await _seed_superadmin(superadmin_client, "role-holder@test.com")
    await _assign_role("role-holder@test.com", "support_agent")
    socket = await _open_admin_socket("role-holder@test.com")

    response = await superadmin_client.post(f"/admin/admins/{target_id}/demote")
    assert response.status_code == 200, response.text

    await _expect_policy_close(socket)
