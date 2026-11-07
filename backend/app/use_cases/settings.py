from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings_registry import (
    SETTINGS_REGISTRY,
    SettingDefinition,
    SettingValue,
    SettingValueType,
    coerce,
)
from app.repositories.system_setting import get_system_setting_by_key


async def _resolve(
    session: AsyncSession, key: str
) -> tuple[SettingDefinition, SettingValue]:
    """Return a setting's definition and effective value (DB override or default)."""
    definition = SETTINGS_REGISTRY.get(key)
    if definition is None:
        raise KeyError(f"unknown setting key: {key}")
    row = await get_system_setting_by_key(session, key)
    value = definition.default if row is None else coerce(definition, row.value)
    return definition, value


async def get_bool(session: AsyncSession, key: str) -> bool:
    """Resolve a boolean setting; raises if the key is not a bool setting."""
    definition, value = await _resolve(session, key)
    if definition.value_type is not SettingValueType.BOOL or not isinstance(
        value, bool
    ):
        raise TypeError(f"{key} is not a boolean setting")
    return value


async def get_int(session: AsyncSession, key: str) -> int:
    """Resolve an integer setting; raises if the key is not an int setting."""
    definition, value = await _resolve(session, key)
    if (
        definition.value_type is not SettingValueType.INT
        or not isinstance(value, int)
        or isinstance(value, bool)
    ):
        raise TypeError(f"{key} is not an integer setting")
    return value


async def get_str(session: AsyncSession, key: str) -> str:
    """Resolve a string setting; raises if the key is not a string setting."""
    definition, value = await _resolve(session, key)
    if definition.value_type is not SettingValueType.STRING or not isinstance(
        value, str
    ):
        raise TypeError(f"{key} is not a string setting")
    return value
