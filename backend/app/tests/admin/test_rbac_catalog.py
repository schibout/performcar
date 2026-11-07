"""Tests for the RBAC permission catalog and audience separation."""

import pytest
from httpx import AsyncClient

from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.rbac import RbacAudience, permissions_allowed_for
from app.tests.admin.conftest import (
    get_user_id,
    promote_to_admin,
    register_and_verify,
)


def test_is_self_permission_detects_self_prefix():
    assert is_self_permission(Permission.SELF_SUPPORT_READ)
    assert not is_self_permission(Permission.SUPPORT_READ)


def test_user_audience_only_admits_self_permissions():
    assert not permissions_allowed_for(RbacAudience.USER, [Permission.SUPPORT_READ])
    assert permissions_allowed_for(RbacAudience.USER, [Permission.SELF_SUPPORT_READ])
    assert not permissions_allowed_for(
        RbacAudience.USER, [Permission.SELF_SUPPORT_READ, Permission.ROLES_READ]
    )


def test_admin_audience_admits_any_permission():
    assert permissions_allowed_for(
        RbacAudience.ADMIN, [Permission.SUPPORT_READ, Permission.SELF_SUPPORT_READ]
    )


@pytest.mark.asyncio
async def test_catalog_hides_self_permissions(superadmin_client: AsyncClient):
    response = await superadmin_client.get("/admin/admins/permissions")
    assert response.status_code == 200
    keys = set(response.json()["permissions"])
    assert Permission.ROLES_READ.value in keys
    assert not any(key.startswith("self.") for key in keys)


@pytest.mark.asyncio
async def test_set_admin_permissions_rejects_self_keys(superadmin_client: AsyncClient):
    await register_and_verify(superadmin_client, "selfkey@test.com")
    await promote_to_admin("selfkey@test.com")
    user_id = await get_user_id("selfkey@test.com")
    response = await superadmin_client.patch(
        f"/admin/admins/{user_id}/permissions",
        json={"permissions": [Permission.SELF_SUPPORT_READ.value]},
    )
    assert response.status_code == 422
