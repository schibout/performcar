"""End-to-end tests for the GET /admin/stats dashboard endpoint."""

from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User
from app.models.user_activity import UserActivity
from app.tests.admin.conftest import promote_to_admin, register_and_verify
from app.tests.conftest import TestingSessionLocal
from app.utils import utc_now


@pytest.mark.asyncio
async def test_stats_requires_admin(regular_client: AsyncClient):
    """A non-admin must receive 403 from /admin/stats."""
    response = await regular_client.get("/admin/stats")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_stats_without_auth_returns_401(client: AsyncClient):
    """An unauthenticated caller must receive 401, not 403."""
    response = await client.get("/admin/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_stats_returns_expected_counts(admin_client: AsyncClient):
    """Stats payload reflects the seeded admin plus verified and unverified users."""
    await register_and_verify(admin_client, "alice@test.com")
    await register_and_verify(admin_client, "bob@test.com")
    await admin_client.post(
        "/auth/register",
        json={
            "email": "unverified@test.com",
            "password": "Password123!",
            "first_name": "U",
            "last_name": "V",
            "title": "T",
        },
    )

    response = await admin_client.get("/admin/stats")
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {
        "users_total",
        "users_active",
        "users_verified",
        "users_admins",
        "activities_total",
        "activities_today",
    }
    assert body["users_total"] >= 4
    assert body["users_active"] >= 4
    assert body["users_verified"] >= 3
    assert body["users_verified"] < body["users_total"]
    assert body["users_admins"] >= 1
    assert body["activities_total"] >= 1


@pytest.mark.asyncio
async def test_activities_today_excludes_older_rows(admin_client: AsyncClient):
    """activities_today counts only the current UTC day; activities_total counts all."""
    before = (await admin_client.get("/admin/stats")).json()

    async with TestingSessionLocal() as session:
        user_id = (
            await session.execute(select(User.id).where(User.email == "admin@test.com"))
        ).scalar_one()
        session.add(
            UserActivity(
                user_id=user_id,
                activity_type="login",
                resource_type="user",
                created_at=utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
                - timedelta(seconds=1),
            )
        )
        await session.commit()

    stats = (await admin_client.get("/admin/stats")).json()
    assert stats["activities_today"] == before["activities_today"]
    assert stats["activities_total"] == before["activities_total"] + 1
    assert stats["activities_today"] < stats["activities_total"]


@pytest.mark.asyncio
async def test_users_admins_counts_superadmins(superadmin_client: AsyncClient):
    """users_admins counts both admin and superadmin accounts."""
    await register_and_verify(superadmin_client, "extra-admin@test.com")
    await promote_to_admin("extra-admin@test.com")

    stats = (await superadmin_client.get("/admin/stats")).json()
    assert stats["users_admins"] == 2
