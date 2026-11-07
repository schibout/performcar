"""Tests of the API managing roles, permission sets and their assignment."""

import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import replace
from datetime import datetime, timedelta
from itertools import batched
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import select, update
from sqlalchemy.dialects import postgresql

from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.core.rbac_catalog import DEFAULT_USER_ROLE_KEY
from app.main import app
from app.models.rbac import (
    RbacPermissionSet,
    RbacPermissionSetItem,
    RbacRole,
    RbacUserPermissionSet,
    RbacUserRole,
)
from app.models.user import User
from app.models.user_activity import UserActivity
from app.repositories.admin.permission import get_user_permissions
from app.repositories.rbac import (
    lock_permission_set_statement,
    lock_role_statement,
)
from app.schemas.admin_permission import Permission
from app.schemas.user import SystemRole
from app.schemas.user_activity import ResourceType
from app.services.admin import rbac_service
from app.tests.admin.conftest import (
    get_user_id,
    grant_permissions,
    login,
    promote_to_admin,
    promote_to_superadmin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal
from app.use_cases.permissions import invalidate_user_permissions
from app.utils import utc_now

SETS = "/admin/rbac/permission-sets"
ROLES = "/admin/rbac/roles"
SUPPORT_AGENT_KEYS = [
    Permission.USERS_READ,
    Permission.SUPPORT_READ,
    Permission.SUPPORT_WRITE,
]

MakeClient = Callable[..., Awaitable[AsyncClient]]


@pytest_asyncio.fixture
async def make_client() -> AsyncIterator[MakeClient]:
    """Build logged-in clients with independent cookie jars."""
    opened: list[AsyncClient] = []

    async def _make(
        email: str,
        tier: SystemRole = SystemRole.ADMIN,
        permissions: list[Permission] | None = None,
    ) -> AsyncClient:
        """Register an account at the given tier, grant keys and log it in."""
        http = AsyncClient(
            transport=ASGITransport(app=app),
            base_url=f"http://test{settings.API_V1_STR}",
        )
        opened.append(http)
        await register_and_verify(http, email)
        if tier == SystemRole.ADMIN:
            await promote_to_admin(email)
        elif tier == SystemRole.SUPERADMIN:
            await promote_to_superadmin(email)
        if permissions:
            await grant_permissions(email, permissions)
        await login(http, email)
        return http

    yield _make
    for http in opened:
        await http.aclose()


@pytest_asyncio.fixture
async def root(make_client: MakeClient) -> AsyncClient:
    """Return a client logged in as a superadmin."""
    return await make_client("root@test.com", SystemRole.SUPERADMIN)


async def _account(email: str) -> uuid.UUID:
    """Register a verified plain account and return its id."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url=f"http://test{settings.API_V1_STR}",
    ) as http:
        await register_and_verify(http, email)
    return uuid.UUID(await get_user_id(email))


async def _role_id(key: str) -> str:
    """Return the id of a role from its key."""
    async with TestingSessionLocal() as session:
        stmt = select(RbacRole.id).where(RbacRole.key == key)
        return str((await session.execute(stmt)).scalar_one())


async def _set_id(key: str) -> str:
    """Return the id of a permission set from its key."""
    async with TestingSessionLocal() as session:
        stmt = select(RbacPermissionSet.id).where(RbacPermissionSet.key == key)
        return str((await session.execute(stmt)).scalar_one())


async def _role_row(key: str) -> RbacRole:
    """Return a role row from its key."""
    async with TestingSessionLocal() as session:
        stmt = select(RbacRole).where(RbacRole.key == key)
        return (await session.execute(stmt)).scalars().one()


async def _tier(user_id: uuid.UUID) -> str:
    """Return the stored tier of an account."""
    async with TestingSessionLocal() as session:
        stmt = select(User.role).where(User.id == user_id)
        return (await session.execute(stmt)).scalar_one()


async def _store_role_assignment(
    user_id: uuid.UUID, key: str, expires_at: datetime | None = None
) -> None:
    """Write a role assignment straight to the database."""
    role_id = uuid.UUID(await _role_id(key))
    async with TestingSessionLocal() as session:
        session.add(
            RbacUserRole(user_id=user_id, role_id=role_id, expires_at=expires_at)
        )
        await session.commit()
    await invalidate_user_permissions(user_id)


async def _store_set_assignment(
    user_id: uuid.UUID, key: str, expires_at: datetime | None = None
) -> None:
    """Write a set assignment straight to the database."""
    set_id = uuid.UUID(await _set_id(key))
    async with TestingSessionLocal() as session:
        session.add(
            RbacUserPermissionSet(user_id=user_id, set_id=set_id, expires_at=expires_at)
        )
        await session.commit()
    await invalidate_user_permissions(user_id)


async def _role_keys(user_id: uuid.UUID) -> set[str]:
    """Return the keys of the roles stored for an account."""
    async with TestingSessionLocal() as session:
        stmt = (
            select(RbacRole.key)
            .join(RbacUserRole, RbacUserRole.role_id == RbacRole.id)
            .where(RbacUserRole.user_id == user_id)
        )
        return set((await session.execute(stmt)).scalars())


async def _set_keys(user_id: uuid.UUID) -> set[str]:
    """Return the keys of the sets stored directly for an account."""
    async with TestingSessionLocal() as session:
        stmt = (
            select(RbacPermissionSet.key)
            .join(
                RbacUserPermissionSet,
                RbacUserPermissionSet.set_id == RbacPermissionSet.id,
            )
            .where(RbacUserPermissionSet.user_id == user_id)
        )
        return set((await session.execute(stmt)).scalars())


async def _last_audit(resource_type: ResourceType) -> UserActivity:
    """Return the newest audit row of a resource type."""
    async with TestingSessionLocal() as session:
        stmt = (
            select(UserActivity)
            .where(UserActivity.resource_type == resource_type.value)
            .order_by(UserActivity.created_at.desc())
            .limit(1)
        )
        return (await session.execute(stmt)).scalars().one()


def _entry(identifier: str, expires_at: datetime | None = None) -> dict:
    """Build one item of an assignment payload."""
    return {
        "id": identifier,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


async def _assignments(*keys: str) -> dict:
    """Build a permanent role assignment payload from role keys."""
    return {"assignments": [_entry(await _role_id(key)) for key in keys]}


def _assert_refused(response: Response, status_code: int, message: str) -> None:
    """Assert a refusal carries the expected status and dedicated message."""
    assert response.status_code == status_code, response.text
    assert response.json()["error"] == message


def _set_payload(key: str = "custom.set", **overrides: object) -> dict:
    """Build a permission set creation payload."""
    return {
        "key": key,
        "name": "Custom set",
        "description": "A set.",
        "audience": "admin",
        "permissions": [Permission.USERS_READ.value],
        **overrides,
    }


def _role_payload(key: str = "custom_role", **overrides: object) -> dict:
    """Build a role creation payload."""
    return {
        "key": key,
        "name": "Custom role",
        "description": "A role.",
        "audience": "admin",
        "permission_set_ids": [],
        **overrides,
    }


# --- Catalog -----------------------------------------------------------------


@pytest.mark.asyncio
async def test_permission_catalog_needs_roles_read_or_permission_sets_read(
    make_client: MakeClient,
):
    """Either read key opens the catalog; an admin holding neither is refused."""
    neither = await make_client("neither@test.com", permissions=[Permission.USERS_READ])
    assert (await neither.get("/admin/rbac/permissions")).status_code == 403

    for index, key in enumerate(
        (Permission.ROLES_READ, Permission.PERMISSION_SETS_READ)
    ):
        client = await make_client(f"either{index}@test.com", permissions=[key])
        assert (await client.get("/admin/rbac/permissions")).status_code == 200


async def test_permission_catalog_needs_roles_read(make_client: MakeClient):
    """The key catalog gives key, resource, action and audience, behind roles:read."""
    refused = await make_client("none@test.com")
    assert (await refused.get("/admin/rbac/permissions")).status_code == 403

    reader = await make_client("reader@test.com", permissions=[Permission.ROLES_READ])
    response = await reader.get("/admin/rbac/permissions")

    assert response.status_code == 200
    entries = {entry["key"]: entry for entry in response.json()["data"]}
    assert set(entries) == {permission.value for permission in Permission}
    assert entries["users:read"] == {
        "key": "users:read",
        "resource": "users",
        "action": "read",
        "audience": "admin",
    }
    assert entries["self.profile:update"] == {
        "key": "self.profile:update",
        "resource": "self.profile",
        "action": "update",
        "audience": "user",
    }


# --- CRUD --------------------------------------------------------------------


@pytest.mark.asyncio
async def test_permission_set_crud(make_client: MakeClient):
    """A holder of the set keys creates, reads, edits and deletes a custom set."""
    actor = await make_client(
        "sets@test.com",
        permissions=[
            Permission.PERMISSION_SETS_READ,
            Permission.PERMISSION_SETS_WRITE,
            Permission.USERS_READ,
            Permission.STATS_READ,
        ],
    )

    created = await actor.post(SETS, json=_set_payload())
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["key"] == "custom.set"
    assert body["audience"] == "admin"
    assert body["is_system"] is False
    assert body["permissions"] == ["users:read"]
    url = f"{SETS}/{body['id']}"

    listed = await actor.get(SETS)
    assert listed.status_code == 200
    assert "custom.set" in {entry["key"] for entry in listed.json()["data"]}

    read = await actor.get(url)
    assert read.status_code == 200
    assert read.json()["id"] == body["id"]

    edited = await actor.patch(
        url, json={"name": "Renamed", "permissions": ["stats:read"]}
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["name"] == "Renamed"
    assert edited.json()["permissions"] == ["stats:read"]
    assert edited.json()["description"] == "A set."

    deleted = await actor.delete(url)
    assert deleted.status_code == 200, deleted.text
    assert (await actor.get(url)).status_code == 404


@pytest.mark.asyncio
async def test_role_crud(make_client: MakeClient):
    """A holder of the role keys creates, reads, edits and deletes a custom role."""
    actor = await make_client(
        "roles@test.com",
        permissions=[
            Permission.ROLES_READ,
            Permission.ROLES_WRITE,
            Permission.USERS_READ,
            Permission.USERS_SUSPEND,
        ],
    )
    users_read = await _set_id("users.read")
    users_suspend = await _set_id("users.suspend")

    created = await actor.post(
        ROLES, json=_role_payload(permission_set_ids=[users_read])
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["is_system"] is False
    assert [item["key"] for item in body["permission_sets"]] == ["users.read"]
    url = f"{ROLES}/{body['id']}"

    listed = await actor.get(ROLES)
    assert listed.status_code == 200
    assert "custom_role" in {entry["key"] for entry in listed.json()["data"]}

    assert (await actor.get(url)).json()["id"] == body["id"]

    edited = await actor.patch(
        url, json={"description": None, "permission_set_ids": [users_suspend]}
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["description"] is None
    assert [item["key"] for item in edited.json()["permission_sets"]] == [
        "users.suspend"
    ]

    assert (await actor.delete(url)).status_code == 200
    assert (await actor.get(url)).status_code == 404


@pytest.mark.asyncio
async def test_crud_routes_refuse_without_their_permission(
    root: AsyncClient, make_client: MakeClient
):
    """Each route is refused to an admin lacking its key, and to a plain account."""
    set_id = (await root.post(SETS, json=_set_payload())).json()["id"]
    role_id = (await root.post(ROLES, json=_role_payload())).json()["id"]
    target = await _account("target@test.com")
    payload = {"assignments": []}
    routes = [
        ("GET", SETS, None),
        ("POST", SETS, _set_payload("other.set")),
        ("GET", f"{SETS}/{set_id}", None),
        ("PATCH", f"{SETS}/{set_id}", {"name": "X"}),
        ("DELETE", f"{SETS}/{set_id}", None),
        ("GET", ROLES, None),
        ("POST", ROLES, _role_payload("other_role")),
        ("GET", f"{ROLES}/{role_id}", None),
        ("PATCH", f"{ROLES}/{role_id}", {"name": "X"}),
        ("DELETE", f"{ROLES}/{role_id}", None),
        ("GET", f"/admin/users/{target}/access", None),
        ("PUT", f"/admin/users/{target}/roles", payload),
        ("PUT", f"/admin/users/{target}/permission-sets", payload),
    ]

    bare_admin = await make_client("bare@test.com")
    plain_user = await make_client("plain@test.com", SystemRole.USER)
    for http in (bare_admin, plain_user):
        for method, url, json in routes:
            response = await http.request(method, url, json=json)
            assert response.status_code == 403, (method, url, response.text)


@pytest.mark.asyncio
async def test_read_key_does_not_open_writes(make_client: MakeClient):
    """The read keys leave creation refused."""
    reader = await make_client(
        "reader@test.com",
        permissions=[Permission.ROLES_READ, Permission.PERMISSION_SETS_READ],
    )
    assert (await reader.get(ROLES)).status_code == 200
    assert (await reader.get(SETS)).status_code == 200
    assert (await reader.post(SETS, json=_set_payload())).status_code == 403
    assert (await reader.post(ROLES, json=_role_payload())).status_code == 403


@pytest.mark.asyncio
async def test_unknown_elements_are_not_found(root: AsyncClient):
    """An unknown id gives the dedicated 404, also inside a payload."""
    unknown = str(uuid.uuid4())
    target = await _account("target@test.com")

    _assert_refused(
        await root.get(f"{SETS}/{unknown}"),
        404,
        ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND,
    )
    _assert_refused(
        await root.get(f"{ROLES}/{unknown}"), 404, ErrorMessages.RBAC_ROLE_NOT_FOUND
    )
    _assert_refused(
        await root.post(ROLES, json=_role_payload(permission_set_ids=[unknown])),
        404,
        ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND,
    )
    _assert_refused(
        await root.put(
            f"/admin/users/{target}/roles",
            json={"assignments": [_entry(unknown)]},
        ),
        404,
        ErrorMessages.RBAC_ROLE_NOT_FOUND,
    )
    _assert_refused(
        await root.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(unknown)]},
        ),
        404,
        ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND,
    )
    response = await root.get(f"/admin/users/{uuid.uuid4()}/access")
    _assert_refused(response, 404, ErrorMessages.USER_NOT_FOUND)


@pytest.mark.asyncio
async def test_duplicate_key_is_a_conflict(root: AsyncClient):
    """A key already taken gives a 409, not a server error."""
    assert (await root.post(SETS, json=_set_payload())).status_code == 201
    _assert_refused(
        await root.post(SETS, json=_set_payload()),
        409,
        ErrorMessages.RBAC_KEY_ALREADY_EXISTS,
    )
    assert (await root.post(ROLES, json=_role_payload())).status_code == 201
    _assert_refused(
        await root.post(ROLES, json=_role_payload()),
        409,
        ErrorMessages.RBAC_KEY_ALREADY_EXISTS,
    )


# --- Rule 1: system elements --------------------------------------------------


@pytest.mark.asyncio
async def test_system_elements_cannot_change(root: AsyncClient):
    """Even a superadmin cannot edit or delete a system role or set."""
    set_url = f"{SETS}/{await _set_id('users.read')}"
    role_url = f"{ROLES}/{await _role_id('auditor')}"

    for response in (
        await root.patch(set_url, json={"name": "Hacked"}),
        await root.delete(set_url),
        await root.patch(role_url, json={"name": "Hacked"}),
        await root.delete(role_url),
    ):
        _assert_refused(response, 403, ErrorMessages.RBAC_SYSTEM_ELEMENT)

    assert (await root.get(set_url)).json()["name"] == "View users"


# --- Rule 2: elements in use --------------------------------------------------


@pytest.mark.asyncio
async def test_assigned_role_cannot_be_deleted(root: AsyncClient):
    """A role still assigned to an account, even expired, stays."""
    role = (await root.post(ROLES, json=_role_payload())).json()
    target = await _account("target@test.com")
    await _store_role_assignment(
        target, "custom_role", expires_at=utc_now() - timedelta(days=1)
    )

    _assert_refused(
        await root.delete(f"{ROLES}/{role['id']}"), 409, ErrorMessages.RBAC_ROLE_IN_USE
    )


@pytest.mark.asyncio
async def test_set_used_by_a_role_cannot_be_deleted(root: AsyncClient):
    """A set included in a role stays."""
    item = (await root.post(SETS, json=_set_payload())).json()
    await root.post(ROLES, json=_role_payload(permission_set_ids=[item["id"]]))

    _assert_refused(
        await root.delete(f"{SETS}/{item['id']}"),
        409,
        ErrorMessages.RBAC_PERMISSION_SET_IN_USE,
    )


@pytest.mark.asyncio
async def test_set_assigned_to_an_account_cannot_be_deleted(root: AsyncClient):
    """A set assigned directly to an account stays."""
    item = (await root.post(SETS, json=_set_payload())).json()
    target = await _account("target@test.com")
    await _store_set_assignment(target, "custom.set")

    _assert_refused(
        await root.delete(f"{SETS}/{item['id']}"),
        409,
        ErrorMessages.RBAC_PERMISSION_SET_IN_USE,
    )


# --- Rule 3: audience ---------------------------------------------------------


@pytest.mark.asyncio
async def test_user_set_only_holds_self_keys(root: AsyncClient):
    """A ``user`` set refuses an admin key, on creation and on edit."""
    _assert_refused(
        await root.post(SETS, json=_set_payload(audience="user")),
        422,
        ErrorMessages.RBAC_PERMISSION_AUDIENCE_MISMATCH,
    )

    created = await root.post(
        SETS,
        json=_set_payload(audience="user", permissions=["self.profile:update"]),
    )
    assert created.status_code == 201, created.text
    _assert_refused(
        await root.patch(
            f"{SETS}/{created.json()['id']}", json={"permissions": ["users:read"]}
        ),
        422,
        ErrorMessages.RBAC_PERMISSION_AUDIENCE_MISMATCH,
    )


@pytest.mark.asyncio
async def test_role_only_holds_sets_of_its_audience(root: AsyncClient):
    """A role refuses a set of the other audience, both ways, also on edit."""
    admin_set = await _set_id("users.read")
    user_set = await _set_id("self.basic")

    _assert_refused(
        await root.post(
            ROLES,
            json=_role_payload(audience="user", permission_set_ids=[admin_set]),
        ),
        422,
        ErrorMessages.RBAC_SET_AUDIENCE_MISMATCH,
    )
    _assert_refused(
        await root.post(ROLES, json=_role_payload(permission_set_ids=[user_set])),
        422,
        ErrorMessages.RBAC_SET_AUDIENCE_MISMATCH,
    )

    created = await root.post(
        ROLES,
        json=_role_payload(audience="user", permission_set_ids=[user_set]),
    )
    assert created.status_code == 201, created.text
    _assert_refused(
        await root.patch(
            f"{ROLES}/{created.json()['id']}",
            json={"permission_set_ids": [admin_set]},
        ),
        422,
        ErrorMessages.RBAC_SET_AUDIENCE_MISMATCH,
    )


@pytest.mark.asyncio
async def test_audience_and_key_cannot_be_edited(root: AsyncClient):
    """An edit cannot move an element to another audience or key."""
    item = (await root.post(SETS, json=_set_payload())).json()
    role = (await root.post(ROLES, json=_role_payload())).json()

    for url in (f"{SETS}/{item['id']}", f"{ROLES}/{role['id']}"):
        assert (await root.patch(url, json={"audience": "user"})).status_code == 422
        assert (await root.patch(url, json={"key": "other"})).status_code == 422
        assert (await root.patch(url, json={"name": None})).status_code == 422


# --- Rule 4: privilege escalation --------------------------------------------


@pytest.mark.asyncio
async def test_set_content_needs_the_keys(make_client: MakeClient):
    """Creating or editing a set needs every key added or withdrawn."""
    actor = await make_client(
        "sets@test.com",
        permissions=[
            Permission.PERMISSION_SETS_READ,
            Permission.PERMISSION_SETS_WRITE,
            Permission.STATS_READ,
        ],
    )
    message = ErrorMessages.RBAC_PRIVILEGE_ESCALATION

    _assert_refused(await actor.post(SETS, json=_set_payload()), 403, message)

    created = await actor.post(SETS, json=_set_payload(permissions=["stats:read"]))
    assert created.status_code == 201, created.text
    url = f"{SETS}/{created.json()['id']}"
    _assert_refused(
        await actor.patch(url, json={"permissions": ["stats:read", "users:read"]}),
        403,
        message,
    )


@pytest.mark.asyncio
async def test_set_withdrawal_needs_the_key(root: AsyncClient, make_client: MakeClient):
    """Withdrawing a key from a set needs that key; a held key may go."""
    created = await root.post(
        SETS, json=_set_payload(permissions=["users:read", "stats:read"])
    )
    url = f"{SETS}/{created.json()['id']}"
    actor = await make_client(
        "sets@test.com",
        permissions=[Permission.PERMISSION_SETS_WRITE, Permission.STATS_READ],
    )

    _assert_refused(
        await actor.patch(url, json={"permissions": ["stats:read"]}),
        403,
        ErrorMessages.RBAC_PRIVILEGE_ESCALATION,
    )
    renamed = await actor.patch(url, json={"name": "Renamed"})
    assert renamed.status_code == 200, renamed.text
    allowed = await actor.patch(url, json={"permissions": ["users:read"]})
    assert allowed.status_code == 200, allowed.text


@pytest.mark.asyncio
async def test_role_content_needs_the_keys(root: AsyncClient, make_client: MakeClient):
    """Creating or editing a role needs the keys of the sets it gains or loses."""
    actor = await make_client(
        "roles@test.com",
        permissions=[Permission.ROLES_WRITE, Permission.USERS_READ],
    )
    held = await _set_id("users.read")
    missing = await _set_id("system.config")
    message = ErrorMessages.RBAC_PRIVILEGE_ESCALATION

    _assert_refused(
        await actor.post(ROLES, json=_role_payload(permission_set_ids=[missing])),
        403,
        message,
    )
    created = await actor.post(ROLES, json=_role_payload(permission_set_ids=[held]))
    assert created.status_code == 201, created.text
    url = f"{ROLES}/{created.json()['id']}"
    _assert_refused(
        await actor.patch(url, json={"permission_set_ids": [held, missing]}),
        403,
        message,
    )

    other = await root.post(
        ROLES, json=_role_payload("other_role", permission_set_ids=[missing])
    )
    _assert_refused(
        await actor.patch(
            f"{ROLES}/{other.json()['id']}", json={"permission_set_ids": []}
        ),
        403,
        message,
    )


@pytest.mark.asyncio
async def test_assignment_needs_the_keys(root: AsyncClient, make_client: MakeClient):
    """Assigning or withdrawing a role or set needs its keys."""
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )
    target = await _account("target@test.com")
    message = ErrorMessages.RBAC_PRIVILEGE_ESCALATION

    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/roles",
            json=await _assignments(DEFAULT_USER_ROLE_KEY, "support_agent"),
        ),
        403,
        message,
    )
    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(await _set_id("users.read"))]},
        ),
        403,
        message,
    )

    other = await _account("other@test.com")
    assert (
        await root.put(
            f"/admin/users/{other}/permission-sets",
            json={"assignments": [_entry(await _set_id("users.read"))]},
        )
    ).status_code == 200
    _assert_refused(
        await actor.put(
            f"/admin/users/{other}/permission-sets", json={"assignments": []}
        ),
        403,
        message,
    )


@pytest.mark.asyncio
async def test_temporary_key_cannot_be_passed_on(make_client: MakeClient):
    """A key the actor holds until a date does not count for a grant."""
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )
    actor_id = uuid.UUID(await get_user_id("actor@test.com"))
    await _store_set_assignment(actor_id, "users.read", utc_now() + timedelta(days=1))
    target = await _account("target@test.com")

    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(await _set_id("users.read"))]},
        ),
        403,
        ErrorMessages.RBAC_PRIVILEGE_ESCALATION,
    )


@pytest.mark.asyncio
async def test_extending_a_term_counts_as_a_grant(make_client: MakeClient):
    """Moving an end date needs the keys; resending the same one does not."""
    target = await _account("target@test.com")
    end = utc_now() + timedelta(days=1)
    await _store_set_assignment(target, "users.read", end)
    await promote_to_admin("target@test.com")
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )
    url = f"/admin/users/{target}/permission-sets"
    set_id = await _set_id("users.read")

    same = await actor.put(url, json={"assignments": [_entry(set_id, end)]})
    assert same.status_code == 200, same.text
    _assert_refused(
        await actor.put(url, json={"assignments": [_entry(set_id)]}),
        403,
        ErrorMessages.RBAC_PRIVILEGE_ESCALATION,
    )


# --- Rule 5: user-audience role -----------------------------------------------


@pytest.mark.asyncio
async def test_account_keeps_a_user_role(root: AsyncClient):
    """An account cannot lose its last ``user`` role, nor keep one that will lapse."""
    target = await _account("target@test.com")
    url = f"/admin/users/{target}/roles"
    message = ErrorMessages.RBAC_USER_ROLE_REQUIRED

    _assert_refused(await root.put(url, json={"assignments": []}), 400, message)
    _assert_refused(
        await root.put(url, json=await _assignments("auditor")), 400, message
    )
    _assert_refused(
        await root.put(
            url,
            json={
                "assignments": [
                    _entry(
                        await _role_id(DEFAULT_USER_ROLE_KEY),
                        utc_now() + timedelta(days=1),
                    )
                ]
            },
        ),
        400,
        message,
    )
    assert await _role_keys(target) == {DEFAULT_USER_ROLE_KEY}

    swapped = await root.put(url, json=await _assignments("user_restricted"))
    assert swapped.status_code == 200, swapped.text
    assert await _role_keys(target) == {"user_restricted"}


# --- Rule 6: superadmin target ------------------------------------------------


@pytest.mark.asyncio
async def test_superadmin_cannot_be_targeted(
    root: AsyncClient, make_client: MakeClient
):
    """Assignment routes refuse a superadmin target, whoever acts."""
    await make_client("other@test.com", SystemRole.SUPERADMIN)
    target = await get_user_id("other@test.com")
    delegate = await make_client(
        "delegate@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )
    payload = await _assignments(DEFAULT_USER_ROLE_KEY)

    for suffix in ("roles", "permission-sets"):
        url = f"/admin/users/{target}/{suffix}"
        _assert_refused(
            await root.put(url, json=payload),
            403,
            ErrorMessages.RBAC_SUPERADMIN_TARGET,
        )
        _assert_refused(
            await delegate.put(url, json=payload),
            403,
            ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN,
        )
    assert await _tier(uuid.UUID(target)) == SystemRole.SUPERADMIN.value


# --- Rule 7: promotion --------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_assignment_needs_admins_write(make_client: MakeClient):
    """Giving an admin role or set to a plain user demands admins:write."""
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, *SUPPORT_AGENT_KEYS],
    )
    target = await _account("target@test.com")
    message = ErrorMessages.RBAC_ADMIN_ASSIGNMENT_FORBIDDEN

    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/roles",
            json=await _assignments(DEFAULT_USER_ROLE_KEY, "support_agent"),
        ),
        403,
        message,
    )
    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(await _set_id("users.read"))]},
        ),
        403,
        message,
    )
    assert await _tier(target) == SystemRole.USER.value
    assert await _role_keys(target) == {DEFAULT_USER_ROLE_KEY}


@pytest.mark.asyncio
async def test_user_audience_assignment_needs_only_users_write(
    make_client: MakeClient,
):
    """A ``user`` role given to a plain user leaves its tier alone."""
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE],
    )
    target = await _account("target@test.com")

    response = await actor.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, "user_restricted"),
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.USER.value


@pytest.mark.asyncio
async def test_admin_target_needs_admins_write(make_client: MakeClient):
    """A plain admin target demands admins:write, whatever is assigned."""
    actor = await make_client("actor@test.com", permissions=[Permission.USERS_WRITE])
    await make_client("target@test.com")
    target = await get_user_id("target@test.com")

    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/roles",
            json=await _assignments(DEFAULT_USER_ROLE_KEY),
        ),
        403,
        ErrorMessages.INSUFFICIENT_PERMISSIONS,
    )
    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/permission-sets", json={"assignments": []}
        ),
        403,
        ErrorMessages.INSUFFICIENT_PERMISSIONS,
    )


@pytest.mark.asyncio
async def test_actor_cannot_change_its_own_access(make_client: MakeClient):
    """An admin cannot rewrite its own assignments."""
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )
    actor_id = await get_user_id("actor@test.com")

    _assert_refused(
        await actor.put(
            f"/admin/users/{actor_id}/permission-sets", json={"assignments": []}
        ),
        400,
        ErrorMessages.ADMIN_CANNOT_MODIFY_SELF,
    )


@pytest.mark.asyncio
async def test_assignment_opens_then_withdrawal_closes_the_panel(
    root: AsyncClient, make_client: MakeClient
):
    """An admin role makes a user an admin and its withdrawal makes it a user again."""
    await make_client("other-admin@test.com")
    user = await make_client("target@test.com", SystemRole.USER)
    target = uuid.UUID(await get_user_id("target@test.com"))
    url = f"/admin/users/{target}/roles"
    assert (await user.get("/admin/users")).status_code == 403

    granted = await root.put(
        url, json=await _assignments(DEFAULT_USER_ROLE_KEY, "support_agent")
    )

    assert granted.status_code == 200, granted.text
    assert granted.json()["account_role"] == "admin"
    assert await _tier(target) == SystemRole.ADMIN.value
    assert (await user.get("/admin/users")).status_code == 200
    me = (await user.get("/users/me")).json()
    assert "support:read" in me["permissions"]

    withdrawn = await root.put(url, json=await _assignments(DEFAULT_USER_ROLE_KEY))

    assert withdrawn.status_code == 200, withdrawn.text
    assert withdrawn.json()["account_role"] == "user"
    assert await _tier(target) == SystemRole.USER.value
    assert (await user.get("/admin/users")).status_code == 403
    assert "support:read" not in (await user.get("/users/me")).json()["permissions"]


@pytest.mark.asyncio
async def test_set_assignment_promotes_and_demotes(
    root: AsyncClient, make_client: MakeClient
):
    """A directly assigned admin set moves the tier as a role does."""
    await make_client("other-admin@test.com")
    user = await make_client("target@test.com", SystemRole.USER)
    target = uuid.UUID(await get_user_id("target@test.com"))
    url = f"/admin/users/{target}/permission-sets"

    granted = await root.put(
        url, json={"assignments": [_entry(await _set_id("users.read"))]}
    )
    assert granted.status_code == 200, granted.text
    assert await _tier(target) == SystemRole.ADMIN.value
    assert (await user.get("/admin/users")).status_code == 200

    withdrawn = await root.put(url, json={"assignments": []})
    assert withdrawn.status_code == 200, withdrawn.text
    assert await _tier(target) == SystemRole.USER.value
    assert (await user.get("/admin/users")).status_code == 403


@pytest.mark.asyncio
async def test_delegate_with_admins_write_promotes(make_client: MakeClient):
    """A delegate holding admins:write and the keys may promote a plain user."""
    actor = await make_client(
        "actor@test.com",
        permissions=[
            Permission.USERS_WRITE,
            Permission.ADMINS_WRITE,
            *SUPPORT_AGENT_KEYS,
        ],
    )
    target = await _account("target@test.com")

    response = await actor.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, "support_agent"),
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.ADMIN.value


# --- Rule 8: demotion ---------------------------------------------------------


@pytest.mark.asyncio
async def test_last_active_admin_cannot_lose_its_last_access(
    root: AsyncClient, make_client: MakeClient
):
    """Withdrawing everything from the only active admin is refused, rows intact."""
    await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_role_assignment(target, "support_agent")

    _assert_refused(
        await root.put(
            f"/admin/users/{target}/roles",
            json=await _assignments(DEFAULT_USER_ROLE_KEY),
        ),
        400,
        ErrorMessages.ADMIN_CANNOT_DEMOTE_LAST_ADMIN,
    )

    assert await _tier(target) == SystemRole.ADMIN.value
    assert await _role_keys(target) == {DEFAULT_USER_ROLE_KEY, "support_agent"}


@pytest.mark.asyncio
async def test_remaining_admin_access_keeps_the_tier(
    root: AsyncClient, make_client: MakeClient
):
    """A remaining admin role, set or direct grant keeps the account an admin."""
    await make_client("other-admin@test.com")
    await make_client("direct@test.com", permissions=[Permission.STATS_READ])
    direct = uuid.UUID(await get_user_id("direct@test.com"))
    await _store_role_assignment(direct, "support_agent")
    await make_client("set@test.com")
    with_set = uuid.UUID(await get_user_id("set@test.com"))
    await _store_role_assignment(with_set, "support_agent")
    await _store_set_assignment(with_set, "users.read", utc_now() + timedelta(days=1))
    await make_client("role@test.com")
    with_role = uuid.UUID(await get_user_id("role@test.com"))
    await _store_role_assignment(with_role, "support_agent")
    await _store_role_assignment(with_role, "auditor")

    for target, payload in (
        (direct, await _assignments(DEFAULT_USER_ROLE_KEY)),
        (with_set, await _assignments(DEFAULT_USER_ROLE_KEY)),
        (with_role, await _assignments(DEFAULT_USER_ROLE_KEY, "auditor")),
    ):
        response = await root.put(f"/admin/users/{target}/roles", json=payload)
        assert response.status_code == 200, response.text
        assert await _tier(target) == SystemRole.ADMIN.value


@pytest.mark.asyncio
async def test_expired_access_does_not_keep_the_tier(
    root: AsyncClient, make_client: MakeClient
):
    """An expired admin set does not hold the tier, and the demotion strips it."""
    await make_client("other-admin@test.com")
    await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_role_assignment(target, "support_agent")
    await _store_set_assignment(target, "users.read", utc_now() - timedelta(days=1))

    response = await root.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY),
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.USER.value
    assert await _set_keys(target) == set()
    assert response.json()["permission_sets"] == []


@pytest.mark.asyncio
async def test_demotion_keeps_user_audience_assignments(
    root: AsyncClient, make_client: MakeClient
):
    """A demotion leaves the ``user`` roles and sets, as the promote strip does."""
    await make_client("other-admin@test.com")
    await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_role_assignment(target, "support_agent")
    await _store_set_assignment(target, "self.readonly")

    response = await root.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY),
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.USER.value
    assert await _set_keys(target) == {"self.readonly"}


@pytest.mark.asyncio
async def test_edit_repairs_an_admin_without_admin_access(
    root: AsyncClient, make_client: MakeClient
):
    """An admin left with no access returns to ``user`` on the next edit."""
    await make_client("other-admin@test.com")
    await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_set_assignment(target, "users.read", utc_now() - timedelta(days=1))
    assert await _tier(target) == SystemRole.ADMIN.value

    response = await root.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY),
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.USER.value
    assert await _set_keys(target) == set()


@pytest.mark.asyncio
async def test_edit_of_a_keyless_last_admin_is_refused(
    root: AsyncClient, make_client: MakeClient
):
    """A keyless last admin stays until an edit gives it access."""
    await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    url = f"/admin/users/{target}/roles"

    _assert_refused(
        await root.put(url, json=await _assignments(DEFAULT_USER_ROLE_KEY)),
        400,
        ErrorMessages.ADMIN_CANNOT_DEMOTE_LAST_ADMIN,
    )
    granted = await root.put(
        url, json=await _assignments(DEFAULT_USER_ROLE_KEY, "auditor")
    )
    assert granted.status_code == 200, granted.text
    assert await _tier(target) == SystemRole.ADMIN.value


@pytest.mark.asyncio
async def test_direct_grant_editor_demotes_on_the_last_grant(
    root: AsyncClient, make_client: MakeClient
):
    """Emptying the editor on an admin holding nothing else closes its panel."""
    await make_client("other-admin@test.com")
    admin = await make_client("target@test.com", permissions=[Permission.USERS_READ])
    target = uuid.UUID(await get_user_id("target@test.com"))
    assert (await admin.get("/admin/users")).status_code == 200

    response = await root.patch(
        f"/admin/admins/{target}/permissions", json={"permissions": []}
    )

    assert response.status_code == 200, response.text
    assert response.json()["admin"]["role"] == SystemRole.USER.value
    assert await _tier(target) == SystemRole.USER.value
    assert await _role_keys(target) == {DEFAULT_USER_ROLE_KEY}
    assert (await admin.get("/admin/users")).status_code == 403
    audit = await _last_audit(ResourceType.USER)
    assert audit.details["account_role"] == SystemRole.USER.value


@pytest.mark.asyncio
async def test_direct_grant_editor_keeps_an_admin_with_a_role(
    root: AsyncClient, make_client: MakeClient
):
    """Emptying the editor leaves the tier while an admin role remains."""
    await make_client("other-admin@test.com")
    await make_client("target@test.com", permissions=[Permission.USERS_READ])
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_role_assignment(target, "auditor")

    response = await root.patch(
        f"/admin/admins/{target}/permissions", json={"permissions": []}
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.ADMIN.value


@pytest.mark.asyncio
async def test_direct_grant_editor_refuses_for_the_last_admin(
    root: AsyncClient, make_client: MakeClient
):
    """Emptying the editor on the only active admin is refused, grants intact."""
    await make_client("target@test.com", permissions=[Permission.USERS_READ])
    target = uuid.UUID(await get_user_id("target@test.com"))

    _assert_refused(
        await root.patch(
            f"/admin/admins/{target}/permissions", json={"permissions": []}
        ),
        400,
        ErrorMessages.ADMIN_CANNOT_DEMOTE_LAST_ADMIN,
    )

    assert await _tier(target) == SystemRole.ADMIN.value
    async with TestingSessionLocal() as session:
        assert await get_user_permissions(session, target) == [Permission.USERS_READ]


@pytest.mark.asyncio
async def test_lapsed_assignment_alone_does_not_move_the_tier(
    root: AsyncClient, make_client: MakeClient
):
    """Reading an admin whose assignment lapsed leaves it an admin with no key."""
    await make_client("other-admin@test.com")
    admin = await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_set_assignment(target, "users.read", utc_now() - timedelta(days=1))

    assert (await admin.get("/admin/users")).status_code == 403
    assert (await root.get(f"/admin/users/{target}/access")).status_code == 200
    assert await _tier(target) == SystemRole.ADMIN.value


# --- Promotion strip ----------------------------------------------------------


@pytest.mark.asyncio
async def test_promotion_does_not_revive_a_lingering_grant(
    root: AsyncClient, make_client: MakeClient
):
    """A direct grant left on a user dies with the promotion, not after it."""
    assert (await root.post(ROLES, json=_role_payload())).status_code == 201
    target_client = await make_client(
        "target@test.com", SystemRole.USER, permissions=[Permission.ADMINS_DELETE]
    )
    target = uuid.UUID(await get_user_id("target@test.com"))
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )

    response = await actor.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, "custom_role"),
    )

    assert response.status_code == 200, response.text
    me = (await target_client.get("/users/me")).json()
    assert me["role"] == SystemRole.ADMIN.value
    assert "admins:delete" not in me["permissions"]
    async with TestingSessionLocal() as session:
        assert await get_user_permissions(session, target) == []
    audit = await _last_audit(ResourceType.USER)
    assert audit.details["stripped_on_promotion"]["direct_permissions"] == [
        "admins:delete"
    ]


@pytest.mark.asyncio
async def test_promotion_checks_the_keys_of_a_resent_admin_row(
    make_client: MakeClient,
):
    """Resending a live admin row on a user counts as granting it, as it wakes it."""
    target_client = await make_client("target@test.com", SystemRole.USER)
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_set_assignment(target, "users.read")
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )

    _assert_refused(
        await actor.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(await _set_id("users.read"))]},
        ),
        403,
        ErrorMessages.RBAC_PRIVILEGE_ESCALATION,
    )

    assert await _tier(target) == SystemRole.USER.value
    assert (await target_client.get("/admin/users")).status_code == 403


@pytest.mark.asyncio
async def test_promotion_strips_lingering_rows_of_the_other_kind(
    root: AsyncClient, make_client: MakeClient
):
    """A lingering admin set does not wake when a role promotes the account."""
    assert (await root.post(ROLES, json=_role_payload())).status_code == 201
    target_client = await make_client("target@test.com", SystemRole.USER)
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_set_assignment(target, "users.read")
    await _store_set_assignment(target, "self.readonly")
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )

    response = await actor.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, "custom_role"),
    )

    assert response.status_code == 200, response.text
    assert await _set_keys(target) == {"self.readonly"}
    assert (await target_client.get("/admin/users")).status_code == 403


@pytest.mark.asyncio
async def test_expired_admin_row_does_not_promote(root: AsyncClient):
    """Resending an expired admin row on a user leaves its tier alone."""
    target = await _account("target@test.com")
    end = utc_now() - timedelta(days=1)
    await _store_set_assignment(target, "users.read", end)

    response = await root.put(
        f"/admin/users/{target}/permission-sets",
        json={"assignments": [_entry(await _set_id("users.read"), end)]},
    )

    assert response.status_code == 200, response.text
    assert await _tier(target) == SystemRole.USER.value


# --- Assignment payload -------------------------------------------------------


@pytest.mark.asyncio
async def test_assignment_payload_is_checked(root: AsyncClient):
    """Duplicates, past dates and dates without a zone are refused."""
    target = await _account("target@test.com")
    url = f"/admin/users/{target}/roles"
    role = await _role_id(DEFAULT_USER_ROLE_KEY)
    other = await _role_id("user_restricted")

    duplicate = await root.put(url, json={"assignments": [_entry(role), _entry(role)]})
    assert duplicate.status_code == 422

    naive = await root.put(
        url,
        json={
            "assignments": [
                _entry(role),
                {"id": other, "expires_at": "2099-01-01T00:00:00"},
            ]
        },
    )
    assert naive.status_code == 422

    _assert_refused(
        await root.put(
            url,
            json={
                "assignments": [
                    _entry(role),
                    _entry(other, utc_now() - timedelta(minutes=1)),
                ]
            },
        ),
        422,
        ErrorMessages.RBAC_EXPIRY_IN_PAST,
    )


@pytest.mark.asyncio
async def test_expired_row_may_be_resent_or_dropped_without_its_keys(
    make_client: MakeClient,
):
    """An expired row resent as is passes, and dropping it withdraws nothing."""
    actor = await make_client(
        "actor@test.com",
        permissions=[Permission.USERS_WRITE, Permission.ADMINS_WRITE],
    )
    await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    end = utc_now() - timedelta(days=1)
    await _store_set_assignment(target, "users.read", end)
    await _store_role_assignment(target, "auditor")
    url = f"/admin/users/{target}/permission-sets"
    set_id = await _set_id("users.read")

    kept = await actor.put(url, json={"assignments": [_entry(set_id, end)]})
    assert kept.status_code == 200, kept.text
    assert kept.json()["permission_sets"][0]["expired"] is True

    dropped = await actor.put(url, json={"assignments": []})
    assert dropped.status_code == 200, dropped.text
    assert await _set_keys(target) == set()


# --- Access -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_access_names_the_source_of_each_key(make_client: MakeClient):
    """``access`` lists assignments and the origin of each effective key."""
    reader = await make_client(
        "reader@test.com",
        permissions=[Permission.USERS_READ, Permission.ADMINS_READ],
    )
    await make_client("target@test.com", permissions=[Permission.USERS_READ])
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_role_assignment(target, "support_agent")
    await _store_set_assignment(target, "users.read")
    await _store_set_assignment(target, "files.manage", utc_now() - timedelta(days=1))

    response = await reader.get(f"/admin/users/{target}/access")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["account_role"] == "admin"
    assert {role["key"] for role in body["roles"]} == {
        DEFAULT_USER_ROLE_KEY,
        "support_agent",
    }
    sets = {item["key"]: item for item in body["permission_sets"]}
    assert sets["users.read"]["expired"] is False
    assert sets["files.manage"]["expired"] is True
    assert body["direct_permissions"] == ["users:read"]

    effective = {row["permission"]: row["sources"] for row in body["effective"]}
    assert effective["users:read"] == [
        {"kind": "direct", "key": "users:read"},
        {"kind": "permission_set", "key": "users.read"},
        {"kind": "role", "key": "support_agent"},
    ]
    assert effective["support:read"] == [{"kind": "role", "key": "support_agent"}]
    assert effective["self.profile:update"] == [
        {"kind": "role", "key": DEFAULT_USER_ROLE_KEY}
    ]
    assert "files:read" not in effective


@pytest.mark.asyncio
async def test_access_of_a_user_hides_keys_outside_its_tier(root: AsyncClient):
    """A plain user is never shown an admin key it could not use."""
    target = await _account("target@test.com")
    await grant_permissions("target@test.com", [Permission.USERS_READ])

    body = (await root.get(f"/admin/users/{target}/access")).json()

    assert body["direct_permissions"] == ["users:read"]
    assert "users:read" not in {row["permission"] for row in body["effective"]}


@pytest.mark.asyncio
async def test_access_of_a_superadmin_shows_every_key(
    root: AsyncClient, make_client: MakeClient
):
    """A superadmin holds every key through its tier."""
    await make_client("other@test.com", SystemRole.SUPERADMIN)
    target = await get_user_id("other@test.com")
    delegate = await make_client(
        "delegate@test.com",
        permissions=[Permission.USERS_READ, Permission.ADMINS_READ],
    )

    for http in (root, delegate):
        response = await http.get(f"/admin/users/{target}/access")
        assert response.status_code == 200, response.text
        effective = {
            row["permission"]: row["sources"] for row in response.json()["effective"]
        }
        assert set(effective) == {permission.value for permission in Permission}
        assert {"kind": "superadmin", "key": "superadmin"} in effective["roles:write"]


@pytest.mark.asyncio
async def test_access_of_an_admin_needs_admins_read(make_client: MakeClient):
    """``users:read`` alone opens plain users, not admin or superadmin accounts."""
    reader = await make_client("reader@test.com", permissions=[Permission.USERS_READ])
    await make_client("admin@test.com")
    await make_client("super@test.com", SystemRole.SUPERADMIN)
    plain = await _account("plain@test.com")

    assert (await reader.get(f"/admin/users/{plain}/access")).status_code == 200
    for email in ("admin@test.com", "super@test.com", "reader@test.com"):
        _assert_refused(
            await reader.get(f"/admin/users/{await get_user_id(email)}/access"),
            403,
            ErrorMessages.INSUFFICIENT_PERMISSIONS,
        )


# --- Rule 9: audit, invalidation, publication ---------------------------------


@pytest.mark.asyncio
async def test_set_mutations_are_audited(root: AsyncClient):
    """Set mutations record before and after by key."""
    item = (await root.post(SETS, json=_set_payload())).json()
    audit = await _last_audit(ResourceType.PERMISSION_SET)
    assert audit.resource_id == uuid.UUID(item["id"])
    assert audit.details["before"] is None
    assert audit.details["after"] == {
        "key": "custom.set",
        "permissions": ["users:read"],
    }

    await root.patch(f"{SETS}/{item['id']}", json={"permissions": ["stats:read"]})
    audit = await _last_audit(ResourceType.PERMISSION_SET)
    assert audit.details["before"]["permissions"] == ["users:read"]
    assert audit.details["after"]["permissions"] == ["stats:read"]

    await root.delete(f"{SETS}/{item['id']}")
    audit = await _last_audit(ResourceType.PERMISSION_SET)
    assert audit.details["before"]["key"] == "custom.set"
    assert audit.details["after"] is None


@pytest.mark.asyncio
async def test_role_mutations_are_audited(root: AsyncClient):
    """Role mutations record before and after by key."""
    users_read = await _set_id("users.read")
    role = (await root.post(ROLES, json=_role_payload())).json()
    audit = await _last_audit(ResourceType.ROLE)
    assert audit.resource_id == uuid.UUID(role["id"])
    assert audit.details["after"] == {"key": "custom_role", "permission_sets": []}

    await root.patch(f"{ROLES}/{role['id']}", json={"permission_set_ids": [users_read]})
    audit = await _last_audit(ResourceType.ROLE)
    assert audit.details["before"]["permission_sets"] == []
    assert audit.details["after"]["permission_sets"] == ["users.read"]

    await root.delete(f"{ROLES}/{role['id']}")
    audit = await _last_audit(ResourceType.ROLE)
    assert audit.details["after"] is None


@pytest.mark.asyncio
async def test_assignments_are_audited_without_personal_data(
    root: AsyncClient, make_client: MakeClient
):
    """An assignment records assignments and tier by key, and no personal data."""
    await make_client("other-admin@test.com")
    target = await _account("target@test.com")

    await root.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, "support_agent"),
    )

    audit = await _last_audit(ResourceType.USER)
    assert audit.resource_id == target
    assert audit.details["before"] == {
        "account_role": "user",
        "assignments": [{"key": DEFAULT_USER_ROLE_KEY, "expires_at": None}],
    }
    assert audit.details["after"] == {
        "account_role": "admin",
        "assignments": [
            {"key": "support_agent", "expires_at": None},
            {"key": DEFAULT_USER_ROLE_KEY, "expires_at": None},
        ],
    }
    assert "test.com" not in str(audit.details)


@pytest.mark.asyncio
async def test_assignment_invalidates_and_publishes(root: AsyncClient):
    """An assignment drops the account's cache and wakes its sockets."""
    target = await _account("target@test.com")

    with (
        patch.object(
            rbac_service, "invalidate_user_permissions", AsyncMock()
        ) as invalidate,
        patch.object(rbac_service, "signal_permissions_changed", AsyncMock()) as signal,
    ):
        response = await root.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(await _set_id("self.readonly"))]},
        )

    assert response.status_code == 200, response.text
    invalidate.assert_awaited_once_with(target)
    signal.assert_awaited_once_with(target)


@pytest.mark.asyncio
async def test_refused_assignment_publishes_nothing(root: AsyncClient):
    """A refused assignment leaves the cache alone and wakes nobody."""
    target = await _account("target@test.com")

    with patch.object(
        rbac_service, "signal_permissions_changed", AsyncMock()
    ) as signal:
        response = await root.put(
            f"/admin/users/{target}/roles", json={"assignments": []}
        )

    assert response.status_code == 400
    signal.assert_not_awaited()


@pytest.mark.asyncio
async def test_role_edit_reaches_each_holder(root: AsyncClient):
    """Editing a role drops every cache and wakes each account holding it."""
    role = (await root.post(ROLES, json=_role_payload())).json()
    holder = await _account("holder@test.com")
    await _store_role_assignment(holder, "custom_role")
    bystander = await _account("bystander@test.com")

    with (
        patch.object(rbac_service, "invalidate_all_permissions", AsyncMock()) as wipe,
        patch.object(rbac_service, "signal_permissions_changed", AsyncMock()) as signal,
    ):
        response = await root.patch(f"{ROLES}/{role['id']}", json={"name": "Renamed"})

    assert response.status_code == 200, response.text
    wipe.assert_awaited_once()
    woken = {call.args[0] for call in signal.await_args_list}
    assert holder in woken
    assert bystander not in woken


@pytest.mark.asyncio
async def test_set_edit_reaches_direct_and_role_holders(root: AsyncClient):
    """Editing a set wakes direct holders and holders through a role, once each."""
    item = (await root.post(SETS, json=_set_payload())).json()
    await root.post(ROLES, json=_role_payload(permission_set_ids=[item["id"]]))
    direct = await _account("direct@test.com")
    await _store_set_assignment(direct, "custom.set")
    through_role = await _account("through@test.com")
    await _store_role_assignment(through_role, "custom_role")
    both = await _account("both@test.com")
    await _store_set_assignment(both, "custom.set")
    await _store_role_assignment(both, "custom_role")
    bystander = await _account("bystander@test.com")

    with (
        patch.object(rbac_service, "invalidate_all_permissions", AsyncMock()) as wipe,
        patch.object(rbac_service, "signal_permissions_changed", AsyncMock()) as signal,
    ):
        response = await root.patch(
            f"{SETS}/{item['id']}", json={"permissions": ["stats:read"]}
        )

    assert response.status_code == 200, response.text
    wipe.assert_awaited_once()
    woken = [call.args[0] for call in signal.await_args_list]
    assert sorted(woken, key=str) == sorted([direct, through_role, both], key=str)
    assert bystander not in woken


@pytest.mark.asyncio
async def test_publication_goes_in_batches(root: AsyncClient):
    """Holders are woken in bounded batches, every one of them."""
    role = (await root.post(ROLES, json=_role_payload())).json()
    holders = [await _account(f"holder{index}@test.com") for index in range(5)]
    for holder in holders:
        await _store_role_assignment(holder, "custom_role")
    sizes: list[int] = []

    def _spy(items: list[uuid.UUID], size: int) -> list[tuple[uuid.UUID, ...]]:
        """Record each batch's size."""
        chunks = list(batched(items, size))
        sizes.extend(len(chunk) for chunk in chunks)
        return chunks

    with (
        patch.object(rbac_service, "_SIGNAL_BATCH_SIZE", 2),
        patch.object(rbac_service, "batched", _spy),
        patch.object(rbac_service, "signal_permissions_changed", AsyncMock()) as signal,
    ):
        await root.patch(f"{ROLES}/{role['id']}", json={"name": "Renamed"})

    assert sizes == [2, 2, 1]
    assert {call.args[0] for call in signal.await_args_list} == set(holders)


@pytest.mark.asyncio
async def test_connected_account_sees_a_role_assignment_at_once(
    root: AsyncClient, make_client: MakeClient
):
    """With its keys cached, an account sees an assignment on its next call."""
    admin = await make_client("target@test.com")
    target = await get_user_id("target@test.com")
    assert (await admin.get("/admin/users")).status_code == 403

    response = await root.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, "support_agent"),
    )

    assert response.status_code == 200, response.text
    assert (await admin.get("/admin/users")).status_code == 200


@pytest.mark.asyncio
async def test_connected_account_sees_a_set_edit_at_once(
    root: AsyncClient, make_client: MakeClient
):
    """With its keys cached, a holder through a role sees a set edit at once."""
    item = (await root.post(SETS, json=_set_payload())).json()
    await root.post(ROLES, json=_role_payload(permission_set_ids=[item["id"]]))
    admin = await make_client("target@test.com")
    target = uuid.UUID(await get_user_id("target@test.com"))
    await _store_role_assignment(target, "custom_role")
    assert (await admin.get("/admin/users")).status_code == 200

    edited = await root.patch(
        f"{SETS}/{item['id']}", json={"permissions": ["stats:read"]}
    )

    assert edited.status_code == 200, edited.text
    assert (await admin.get("/admin/users")).status_code == 403


@pytest.mark.asyncio
async def test_expired_role_is_not_a_source(root: AsyncClient):
    """An expired role gives no key, whatever the tier row says."""
    target = await _account("target@test.com")
    async with TestingSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == target).values(role=SystemRole.ADMIN.value)
        )
        await session.commit()
    await _store_role_assignment(target, "auditor", utc_now() - timedelta(days=1))

    body = (await root.get(f"/admin/users/{target}/access")).json()

    assert "stats:read" not in {row["permission"] for row in body["effective"]}
    auditor = next(role for role in body["roles"] if role["key"] == "auditor")
    assert auditor["expired"] is True


@pytest.mark.asyncio
async def test_set_edit_invalidates_after_commit(root: AsyncClient):
    """When the cache drops, the edit and its audit are visible to other readers."""
    item = (await root.post(SETS, json=_set_payload())).json()
    seen: dict[str, object] = {}

    async def _read_state() -> None:
        """Read what another connection sees at invalidation time."""
        async with TestingSessionLocal() as session:
            stmt = select(RbacPermissionSetItem.permission).where(
                RbacPermissionSetItem.set_id == uuid.UUID(item["id"])
            )
            seen["keys"] = list((await session.execute(stmt)).scalars())
        seen["after"] = (await _last_audit(ResourceType.PERMISSION_SET)).details[
            "after"
        ]

    with patch.object(
        rbac_service, "invalidate_all_permissions", AsyncMock(side_effect=_read_state)
    ):
        response = await root.patch(
            f"{SETS}/{item['id']}", json={"permissions": ["stats:read"]}
        )

    assert response.status_code == 200, response.text
    assert seen["keys"] == ["stats:read"]
    assert seen["after"]["permissions"] == ["stats:read"]


# --- Locks and races ----------------------------------------------------------


@pytest.mark.parametrize(
    ("loader", "model"),
    [
        (lock_role_statement, RbacRole),
        (lock_permission_set_statement, RbacPermissionSet),
    ],
)
def test_element_lock_reads_fresh_rows_for_update(loader, model):
    """The element lock asks PostgreSQL for the row, past the identity map."""
    stmt = loader(uuid.uuid4())

    assert "FOR UPDATE" in str(stmt.compile(dialect=postgresql.dialect()))
    assert stmt.get_execution_options()["populate_existing"] is True
    assert stmt.column_descriptions[0]["entity"] is model


@pytest.mark.asyncio
async def test_element_edits_and_deletes_take_the_lock(root: AsyncClient):
    """Update and delete read the element through its lock, before its content."""
    item = (await root.post(SETS, json=_set_payload())).json()
    role = (await root.post(ROLES, json=_role_payload())).json()
    calls: list[str] = []
    real_set_lock = rbac_service.lock_permission_set
    real_role_lock = rbac_service.lock_role
    real_items = rbac_service.get_permissions_by_set
    real_sets = rbac_service.get_sets_by_role

    async def _set_lock(session, set_id):
        """Record the lock."""
        calls.append("lock")
        return await real_set_lock(session, set_id)

    async def _role_lock(session, role_id):
        """Record the lock."""
        calls.append("lock")
        return await real_role_lock(session, role_id)

    async def _items(session, ids):
        """Record the content read."""
        calls.append("read")
        return await real_items(session, ids)

    async def _sets(session, ids):
        """Record the content read."""
        calls.append("read")
        return await real_sets(session, ids)

    with (
        patch.object(rbac_service, "lock_permission_set", _set_lock),
        patch.object(rbac_service, "lock_role", _role_lock),
        patch.object(rbac_service, "get_permissions_by_set", _items),
        patch.object(rbac_service, "get_sets_by_role", _sets),
    ):
        for method, url, json in (
            ("PATCH", f"{SETS}/{item['id']}", {"name": "Renamed"}),
            ("PATCH", f"{ROLES}/{role['id']}", {"name": "Renamed"}),
            ("DELETE", f"{ROLES}/{role['id']}", None),
            ("DELETE", f"{SETS}/{item['id']}", None),
        ):
            calls.clear()
            response = await root.request(method, url, json=json)
            assert response.status_code == 200, response.text
            assert calls[0] == "lock", (method, url, calls)


def _vanished_set(audience: str = "admin") -> RbacPermissionSet:
    """Build a set a concurrent delete has already removed from the database."""
    return RbacPermissionSet(
        id=uuid.uuid4(), key="gone", name="Gone", audience=audience
    )


@pytest.mark.asyncio
async def test_role_creation_reports_a_set_deleted_meanwhile(root: AsyncClient):
    """A set vanishing after its check gives the 404, not a key conflict."""
    gone = _vanished_set()

    with patch.object(rbac_service, "_load_role_sets", AsyncMock(return_value=[gone])):
        response = await root.post(
            ROLES, json=_role_payload(permission_set_ids=[str(gone.id)])
        )

    _assert_refused(response, 404, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND)


@pytest.mark.asyncio
async def test_role_edit_reports_a_set_deleted_meanwhile(root: AsyncClient):
    """A set vanishing after its check gives the 404, not a server error."""
    role = (await root.post(ROLES, json=_role_payload())).json()
    gone = _vanished_set()

    with patch.object(rbac_service, "_load_role_sets", AsyncMock(return_value=[gone])):
        response = await root.patch(
            f"{ROLES}/{role['id']}", json={"permission_set_ids": [str(gone.id)]}
        )

    _assert_refused(response, 404, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND)


@pytest.mark.asyncio
async def test_assignment_reports_a_set_deleted_meanwhile(root: AsyncClient):
    """A set vanishing before the assignment is written gives the 404."""
    target = await _account("target@test.com")
    gone = _vanished_set(audience="user")
    kind = replace(rbac_service._SETS, load=AsyncMock(return_value=[gone]))

    with patch.object(rbac_service, "_SETS", kind):
        response = await root.put(
            f"/admin/users/{target}/permission-sets",
            json={"assignments": [_entry(str(gone.id))]},
        )

    _assert_refused(response, 404, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND)


@pytest.mark.asyncio
async def test_assignment_reports_a_role_deleted_meanwhile(root: AsyncClient):
    """A role vanishing before the assignment is written gives the 404."""
    target = await _account("target@test.com")
    kept = await _role_row(DEFAULT_USER_ROLE_KEY)
    gone = RbacRole(id=uuid.uuid4(), key="gone", name="Gone", audience="user")
    kind = replace(rbac_service._ROLES, load=AsyncMock(return_value=[kept, gone]))

    with patch.object(rbac_service, "_ROLES", kind):
        response = await root.put(
            f"/admin/users/{target}/roles",
            json={"assignments": [_entry(str(kept.id)), _entry(str(gone.id))]},
        )

    _assert_refused(response, 404, ErrorMessages.RBAC_ROLE_NOT_FOUND)


async def test_role_edit_reaches_an_account_with_a_cached_entry(
    root: AsyncClient, make_client: MakeClient, fake_redis: FakeRedis
):
    """Editing a role changes its holder's next read through real invalidation."""
    holder = await make_client("holder@test.com")
    created = await root.post(
        ROLES, json=_role_payload(permission_set_ids=[await _set_id("users.read")])
    )
    assert created.status_code == 201, created.text
    role = created.json()
    target = uuid.UUID(await get_user_id("holder@test.com"))
    assigned = await root.put(
        f"/admin/users/{target}/roles",
        json=await _assignments(DEFAULT_USER_ROLE_KEY, role["key"]),
    )
    assert assigned.status_code == 200, assigned.text

    before = (await holder.get("/users/me")).json()["permissions"]
    assert Permission.USERS_READ.value in before
    assert await fake_redis.keys(f"perms:*:{target}"), "the read must fill the cache"

    edited = await root.patch(
        f"{ROLES}/{role['id']}",
        json={"permission_set_ids": [await _set_id("users.suspend")]},
    )
    assert edited.status_code == 200, edited.text

    after = (await holder.get("/users/me")).json()["permissions"]
    assert Permission.USERS_READ.value not in after
    assert Permission.USERS_SUSPEND.value in after
