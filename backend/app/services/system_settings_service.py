from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.core.settings_registry import (
    SETTINGS_REGISTRY,
    SettingDefinition,
    SettingValue,
    SettingValueType,
    coerce,
    to_str,
)
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.repositories.system_setting import (
    get_all_system_settings,
    get_system_setting_by_key,
    upsert_system_setting,
)
from app.schemas.system_settings import (
    PublicSettingsResponse,
    SettingRead,
    SettingsListResponse,
    SettingUpdate,
    SettingUpdateResponse,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.log_activity import log_activity


def _type_matches(value_type: SettingValueType, value: SettingValue) -> bool:
    """True if ``value``'s Python type matches the declared setting type."""
    if value_type is SettingValueType.BOOL:
        return isinstance(value, bool)
    if value_type is SettingValueType.INT:
        return isinstance(value, int) and not isinstance(value, bool)
    return isinstance(value, str)


def _to_read(
    definition: SettingDefinition,
    value: SettingValue,
    row: SystemSetting | None,
) -> SettingRead:
    """Build the API read model from a definition, its value, and optional row."""
    return SettingRead(
        key=definition.key,
        value=value,
        value_type=definition.value_type,
        category=definition.category,
        is_public=definition.is_public,
        description=definition.description,
        updated_at=row.updated_at if row else None,
        updated_by=row.updated_by if row else None,
    )


async def _resolved_items(session: AsyncSession) -> list[SettingRead]:
    """Merge the registry with override rows into a full read list (one query)."""
    rows = {r.key: r for r in await get_all_system_settings(session)}
    items: list[SettingRead] = []
    for key, definition in SETTINGS_REGISTRY.items():
        row = rows.get(key)
        value = definition.default if row is None else coerce(definition, row.value)
        items.append(_to_read(definition, value, row))
    return items


async def list_all_settings_service(session: AsyncSession) -> SettingsListResponse:
    """Return every setting with metadata and value, for the admin UI."""
    return SettingsListResponse(data=await _resolved_items(session))


async def get_public_settings_service(
    session: AsyncSession,
) -> PublicSettingsResponse:
    """Return only public settings as key -> value, for unauthenticated clients."""
    items = await _resolved_items(session)
    return PublicSettingsResponse(
        data={item.key: item.value for item in items if item.is_public}
    )


async def update_setting_service(
    session: AsyncSession,
    *,
    key: str,
    payload: SettingUpdate,
    admin: User,
    request: Request | None = None,
) -> SettingUpdateResponse:
    """Validate and persist an admin's change to one setting, then audit it."""
    definition = SETTINGS_REGISTRY.get(key)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.SETTING_NOT_FOUND,
        )
    if not _type_matches(definition.value_type, payload.value):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=ErrorMessages.SETTING_INVALID_VALUE,
        )
    if definition.validate is not None:
        try:
            definition.validate(payload.value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=ErrorMessages.SETTING_INVALID_VALUE,
            ) from exc

    previous = await get_system_setting_by_key(session, key)
    before: SettingValue = definition.default
    if previous:
        # A corrupt stored value must not block the only route that can repair it.
        try:
            before = coerce(definition, previous.value)
        except ValueError:
            before = previous.value
    row = await upsert_system_setting(
        session, key=key, value=to_str(payload.value), updated_by=admin.id
    )
    await log_activity(
        session,
        user_id=admin.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.SYSTEM_SETTINGS,
        resource_id=row.id,
        details={"key": key, "before": before, "after": payload.value},
        request=request,
    )
    return SettingUpdateResponse(
        setting=_to_read(definition, coerce(definition, row.value), row),
        message=SuccessMessages.SETTINGS_UPDATED,
    )
