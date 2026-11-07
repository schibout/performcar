from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request

from app.api.decorators import audit_unexpected_failure
from app.api.deps import SessionDep, require_permission
from app.core.rate_limit import rate_limit_authenticated
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.system_settings import (
    SettingsListResponse,
    SettingUpdate,
    SettingUpdateResponse,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.services.system_settings_service import (
    list_all_settings_service,
    update_setting_service,
)

router = APIRouter()

AdminSettingsRead = Annotated[
    User, Depends(require_permission(Permission.SYSTEM_SETTINGS_READ))
]
AdminSettingsWrite = Annotated[
    User, Depends(require_permission(Permission.SYSTEM_SETTINGS_WRITE))
]


@router.get("/system-settings", response_model=SettingsListResponse)
@audit_unexpected_failure(
    activity_type=ActivityType.READ,
    resource_type=ResourceType.SYSTEM_SETTINGS,
    endpoint="/admin/system-settings",
)
async def list_system_settings(
    _request: Request,
    _admin: AdminSettingsRead,
    session: SessionDep,
) -> SettingsListResponse:
    """List every system setting with its metadata and current value."""
    return await list_all_settings_service(session)


@router.patch("/system-settings/{key}", response_model=SettingUpdateResponse)
@rate_limit_authenticated("30/minute")
@audit_unexpected_failure(
    activity_type=ActivityType.UPDATE,
    resource_type=ResourceType.SYSTEM_SETTINGS,
    endpoint="/admin/system-settings/{key}",
)
async def update_system_setting(
    request: Request,
    admin: AdminSettingsWrite,
    session: SessionDep,
    payload: SettingUpdate,
    key: Annotated[str, Path()],
) -> SettingUpdateResponse:
    """Update one system setting's value (RBAC-guarded and audited)."""
    return await update_setting_service(
        session=session, key=key, payload=payload, admin=admin, request=request
    )
