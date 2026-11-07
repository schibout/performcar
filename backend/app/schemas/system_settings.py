import uuid
from datetime import datetime

from pydantic import BaseModel

from app.core.settings_registry import SettingCategory, SettingValue, SettingValueType


class SettingRead(BaseModel):
    """One setting's effective state: registry metadata + resolved value."""

    key: str
    value: SettingValue
    value_type: SettingValueType
    category: SettingCategory
    is_public: bool
    description: str
    updated_at: datetime | None = None
    updated_by: uuid.UUID | None = None


class SettingsListResponse(BaseModel):
    """Admin view: every setting with metadata and current value."""

    data: list[SettingRead]


class PublicSettingsResponse(BaseModel):
    """Unauthenticated view: only ``is_public`` settings as key -> value."""

    data: dict[str, SettingValue]


class SettingUpdate(BaseModel):
    """Admin request body to change one setting's value."""

    value: SettingValue


class SettingUpdateResponse(BaseModel):
    """The updated setting plus a success message key."""

    setting: SettingRead
    message: str
