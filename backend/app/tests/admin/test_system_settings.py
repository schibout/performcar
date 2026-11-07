"""Tests for the system-settings endpoints and the maintenance-mode middleware.

Covers the admin read/patch endpoints (RBAC, type + registry validation,
unknown key), the unauthenticated public endpoint (only public keys leak), and
the maintenance gate (non-admins blocked with 503, admins and exempt paths pass).
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.core.settings_registry import SETTINGS_REGISTRY
from app.models.user_activity import UserActivity
from app.repositories.system_setting import upsert_system_setting
from app.schemas.admin_permission import Permission
from app.schemas.user_activity import ActivityType, ResourceType
from app.tests.admin.conftest import (
    grant_permissions,
    login,
    promote_to_admin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal


async def _enable_maintenance() -> None:
    """Turn maintenance mode on directly in the DB (skips the admin endpoint)."""
    async with TestingSessionLocal() as session:
        await upsert_system_setting(
            session, key="maintenance_mode", value="true", updated_by=None
        )


# --- Admin endpoints ---------------------------------------------------------


@pytest.mark.asyncio
async def test_list_settings_returns_registry(admin_client: AsyncClient):
    """The admin list returns every registered setting with its metadata."""
    response = await admin_client.get("/admin/system-settings")
    assert response.status_code == 200, response.text
    keys = {item["key"] for item in response.json()["data"]}
    assert {"maintenance_mode", "registration_enabled", "site_name"} <= keys


@pytest.mark.asyncio
async def test_patch_setting_updates_value(admin_client: AsyncClient):
    """A valid PATCH persists the new value and returns the success message."""
    response = await admin_client.patch(
        "/admin/system-settings/maintenance_mode", json={"value": True}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["setting"]["value"] is True
    assert body["message"] == SuccessMessages.SETTINGS_UPDATED


@pytest.mark.asyncio
async def test_patch_repairs_a_corrupt_stored_value(admin_client: AsyncClient):
    """PATCH overwrites an unparseable value and audits the raw text as ``before``."""
    async with TestingSessionLocal() as session:
        await upsert_system_setting(
            session, key="max_upload_size_mb", value="not-a-number", updated_by=None
        )

    response = await admin_client.patch(
        "/admin/system-settings/max_upload_size_mb", json={"value": 10}
    )
    assert response.status_code == 200, response.text
    assert response.json()["setting"]["value"] == 10

    async with TestingSessionLocal() as session:
        row = (
            await session.execute(
                select(UserActivity).where(
                    UserActivity.resource_type == ResourceType.SYSTEM_SETTINGS.value
                )
            )
        ).scalar_one()
    assert row.details == {
        "key": "max_upload_size_mb",
        "before": "not-a-number",
        "after": 10,
    }


@pytest.mark.asyncio
async def test_update_setting_audits_before_and_after(admin_client: AsyncClient):
    """Each update is audited with the previous and new value of the setting."""
    for value in ("First name", "Second name"):
        response = await admin_client.patch(
            "/admin/system-settings/site_name", json={"value": value}
        )
        assert response.status_code == 200, response.text

    async with TestingSessionLocal() as session:
        rows = (
            (
                await session.execute(
                    select(UserActivity)
                    .where(
                        UserActivity.resource_type
                        == ResourceType.SYSTEM_SETTINGS.value,
                        UserActivity.activity_type == ActivityType.UPDATE.value,
                    )
                    .order_by(UserActivity.created_at, UserActivity.id)
                )
            )
            .scalars()
            .all()
        )
    by_after = {row.details["after"]: row.details for row in rows}
    assert by_after["First name"] == {
        "key": "site_name",
        "before": SETTINGS_REGISTRY["site_name"].default,
        "after": "First name",
    }
    assert by_after["Second name"] == {
        "key": "site_name",
        "before": "First name",
        "after": "Second name",
    }


@pytest.mark.asyncio
async def test_patch_unknown_key_returns_404(admin_client: AsyncClient):
    """An unknown setting key is rejected with 404."""
    response = await admin_client.patch(
        "/admin/system-settings/does_not_exist", json={"value": True}
    )
    assert response.status_code == 404
    assert response.json()["error"] == ErrorMessages.SETTING_NOT_FOUND


@pytest.mark.asyncio
async def test_patch_wrong_type_returns_422(admin_client: AsyncClient):
    """A value whose type mismatches the setting is rejected with 422."""
    response = await admin_client.patch(
        "/admin/system-settings/maintenance_mode", json={"value": "not-a-bool"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_patch_invalid_value_returns_422(admin_client: AsyncClient):
    """A value failing the registry validator is rejected with 422."""
    response = await admin_client.patch(
        "/admin/system-settings/default_locale", json={"value": "de"}
    )
    assert response.status_code == 422
    assert response.json()["error"] == ErrorMessages.SETTING_INVALID_VALUE


@pytest.mark.asyncio
async def test_settings_require_permission(client: AsyncClient):
    """An admin lacking system_settings perms is forbidden on read and write."""
    await register_and_verify(client, "limited@test.com")
    await promote_to_admin("limited@test.com")
    await grant_permissions("limited@test.com", [Permission.USERS_READ])
    await login(client, "limited@test.com")

    assert (await client.get("/admin/system-settings")).status_code == 403
    patched = await client.patch(
        "/admin/system-settings/maintenance_mode", json={"value": True}
    )
    assert patched.status_code == 403


# --- Public endpoint ---------------------------------------------------------


@pytest.mark.asyncio
async def test_public_settings_exposes_only_public(client: AsyncClient):
    """The unauthenticated endpoint returns public keys and hides private ones."""
    response = await client.get("/settings/public")
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert "site_name" in data
    assert "maintenance_mode" in data
    # max_upload_size_mb is is_public=False — it must never leak here.
    assert "max_upload_size_mb" not in data


# --- Maintenance-mode middleware ---------------------------------------------


@pytest.mark.asyncio
async def test_maintenance_blocks_anonymous(client: AsyncClient):
    """With maintenance on, an anonymous request to a gated path gets 503."""
    await _enable_maintenance()
    response = await client.get("/users/me")
    assert response.status_code == 503
    assert response.json()["error"] == ErrorMessages.MAINTENANCE_MODE


@pytest.mark.asyncio
async def test_maintenance_blocks_regular_user(regular_client: AsyncClient):
    """With maintenance on, a non-admin user is blocked with 503."""
    await _enable_maintenance()
    assert (await regular_client.get("/users/me")).status_code == 503


@pytest.mark.asyncio
async def test_maintenance_allows_admin(admin_client: AsyncClient):
    """Admins keep working while maintenance mode is on."""
    await _enable_maintenance()
    assert (await admin_client.get("/users/me")).status_code == 200


@pytest.mark.asyncio
async def test_maintenance_exempts_public_settings(client: AsyncClient):
    """The public settings endpoint stays reachable during maintenance."""
    await _enable_maintenance()
    assert (await client.get("/settings/public")).status_code == 200


@pytest.mark.asyncio
async def test_maintenance_exempts_login(client: AsyncClient):
    """Login stays reachable during maintenance so admins can authenticate."""
    await _enable_maintenance()
    response = await client.post(
        "/auth/login", data={"username": "nobody@test.com", "password": "x"}
    )
    assert response.status_code != 503
