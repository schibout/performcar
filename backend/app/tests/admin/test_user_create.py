"""Tests for POST /admin/users (an admin creates an account directly)."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.main import app
from app.models.rbac import RbacRole
from app.schemas.user import SystemRole
from app.tests.conftest import TestingSessionLocal

PASSWORD = "Password123!"


def _payload(email: str, **extra: object) -> dict:
    """Build a creation payload."""
    return {
        "email": email,
        "first_name": "Jo",
        "last_name": "Doe",
        "password": PASSWORD,
        **extra,
    }


async def _role_id(key: str) -> str:
    """Return the id of a role from its key."""
    async with TestingSessionLocal() as session:
        stmt = select(RbacRole.id).where(RbacRole.key == key)
        return str((await session.execute(stmt)).scalar_one())


@pytest.mark.asyncio
async def test_admin_creates_verified_user_who_can_log_in(admin_client: AsyncClient):
    """The account is active, verified, plain user tier, and usable at once."""
    response = await admin_client.post("/admin/users", json=_payload("new@test.com"))
    assert response.status_code == 201, response.text
    user = response.json()["user"]
    assert user["role"] == SystemRole.USER.value
    assert user["is_active"] and user["is_verified"]

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url=f"http://test{settings.API_V1_STR}"
    ) as fresh:
        login = await fresh.post(
            "/auth/login", data={"username": "new@test.com", "password": PASSWORD}
        )
        assert login.status_code == 200, login.text


@pytest.mark.asyncio
async def test_create_user_rejects_duplicate_email(admin_client: AsyncClient):
    """A second account with the same email is refused with 409."""
    assert (
        await admin_client.post("/admin/users", json=_payload("dup@test.com"))
    ).status_code == 201
    response = await admin_client.post("/admin/users", json=_payload("dup@test.com"))
    assert response.status_code == 409
    assert response.json()["error"] == ErrorMessages.EMAIL_ALREADY_EXISTS


@pytest.mark.asyncio
async def test_create_user_rejects_unknown_dealership(admin_client: AsyncClient):
    """An unknown dealership id is a 404, and no account is created."""
    response = await admin_client.post(
        "/admin/users",
        json=_payload(
            "lost@test.com", dealership_id="00000000-0000-0000-0000-000000000001"
        ),
    )
    assert response.status_code == 404
    listing = await admin_client.get("/admin/users", params={"search": "lost@test.com"})
    assert listing.json()["total"] == 0


@pytest.mark.asyncio
async def test_create_user_forbidden_for_regular_user(regular_client: AsyncClient):
    """A plain user cannot create accounts."""
    response = await regular_client.post("/admin/users", json=_payload("x@test.com"))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_created_user_role_switches_account_tier(admin_client: AsyncClient):
    """An admin-audience role promotes the new account; removing it demotes it."""
    created = await admin_client.post("/admin/users", json=_payload("tier@test.com"))
    user_id = created.json()["user"]["id"]
    user_role, admin_role = await _role_id("user"), await _role_id("administrator")

    promote = await admin_client.put(
        f"/admin/users/{user_id}/roles",
        json={"assignments": [{"id": user_role}, {"id": admin_role}]},
    )
    assert promote.status_code == 200, promote.text
    assert (await admin_client.get(f"/admin/users/{user_id}")).json()["role"] == "admin"

    demote = await admin_client.put(
        f"/admin/users/{user_id}/roles", json={"assignments": [{"id": user_role}]}
    )
    assert demote.status_code == 200, demote.text
    assert (await admin_client.get(f"/admin/users/{user_id}")).json()["role"] == "user"
