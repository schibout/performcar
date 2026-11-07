"""Central, typed registry of system settings.

Single source of truth for every configurable setting: its type, default,
category, public visibility, and validation. The ``system_setting`` table only
stores admin-overridden *values* keyed by ``key``; everything else lives here,
so a setting cannot drift between code and database.

Resolution order at read time is: DB override → env/config default (where a
definition's default is sourced from :data:`app.core.config.settings`) →
static fallback below. A missing DB row therefore falls back to the env value,
so settings are initialised from the environment yet remain editable at runtime.
"""

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum

from app.core.config import settings

# Settings only ever hold scalar values; no nested/JSON settings in phase one.
SettingValue = bool | int | str


class SettingValueType(StrEnum):
    """The concrete Python type a setting's value coerces to."""

    BOOL = "bool"
    INT = "int"
    STRING = "string"


class SettingCategory(StrEnum):
    """Logical group a setting belongs to, used to tab the admin UI."""

    SYSTEM = "system"
    AUTH = "auth"
    UPLOADS = "uploads"
    SUPPORT = "support"
    BRANDING = "branding"


@dataclass(frozen=True)
class SettingDefinition:
    """Immutable metadata describing one configurable setting."""

    key: str
    value_type: SettingValueType
    default: SettingValue
    category: SettingCategory
    is_public: bool
    description: str
    validate: Callable[[SettingValue], None] | None = None


def _validate_locale(value: SettingValue) -> None:
    """Reject any default locale other than the supported ``fr``/``en``."""
    if value not in ("fr", "en"):
        raise ValueError("default_locale must be 'fr' or 'en'")


def _validate_upload_size(value: SettingValue) -> None:
    """Keep the max upload size within a sane 1-100 MB band."""
    if not isinstance(value, int) or not 1 <= value <= 100:
        raise ValueError("max_upload_size_mb must be between 1 and 100")


def _validate_non_empty(value: SettingValue) -> None:
    """Reject blank strings for settings that must carry text."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError("value must be a non-empty string")


_DEFINITIONS: tuple[SettingDefinition, ...] = (
    SettingDefinition(
        "maintenance_mode",
        SettingValueType.BOOL,
        False,
        SettingCategory.SYSTEM,
        True,
        "When on, only admins can reach the app; everyone else gets 503.",
    ),
    SettingDefinition(
        "registration_enabled",
        SettingValueType.BOOL,
        True,
        SettingCategory.AUTH,
        True,
        "When off, new account registration is rejected.",
    ),
    SettingDefinition(
        "max_upload_size_mb",
        SettingValueType.INT,
        settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024),
        SettingCategory.UPLOADS,
        False,
        "Maximum allowed upload size in megabytes.",
        validate=_validate_upload_size,
    ),
    SettingDefinition(
        "support_enabled",
        SettingValueType.BOOL,
        True,
        SettingCategory.SUPPORT,
        True,
        "When off, users cannot open new support tickets.",
    ),
    SettingDefinition(
        "site_name",
        SettingValueType.STRING,
        settings.PROJECT_NAME,
        SettingCategory.BRANDING,
        True,
        "Product/site display name.",
        validate=_validate_non_empty,
    ),
    SettingDefinition(
        "logo_url",
        SettingValueType.STRING,
        "",
        SettingCategory.BRANDING,
        True,
        "Public URL of the site logo (stored on Cloudinary).",
    ),
    SettingDefinition(
        "support_email",
        SettingValueType.STRING,
        "support@example.com",
        SettingCategory.BRANDING,
        True,
        "Contact/support email address.",
        validate=_validate_non_empty,
    ),
    SettingDefinition(
        "default_locale",
        SettingValueType.STRING,
        settings.DEFAULT_LANGUAGE,
        SettingCategory.BRANDING,
        True,
        "Default language for new users (fr/en).",
        validate=_validate_locale,
    ),
)

SETTINGS_REGISTRY: dict[str, SettingDefinition] = {d.key: d for d in _DEFINITIONS}


def get_definition(key: str) -> SettingDefinition | None:
    """Return the definition for ``key`` or ``None`` if it is unknown."""
    return SETTINGS_REGISTRY.get(key)


def coerce(definition: SettingDefinition, raw: str) -> SettingValue:
    """Parse a stored string into its typed value per the definition.

    Raises ``ValueError`` if the stored text does not match the declared type.
    """
    if definition.value_type is SettingValueType.BOOL:
        return raw.lower() == "true"
    if definition.value_type is SettingValueType.INT:
        return int(raw)
    return raw


def to_str(value: SettingValue) -> str:
    """Serialise a typed value to its DB string form."""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)
