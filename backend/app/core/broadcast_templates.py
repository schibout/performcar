"""Catalog of reusable announcement templates.

A template announcement stores only a ``template_key`` + ``variables``; the
localized text is resolved at render time. This catalog is the source for the
**email** channel (rendered server-side here) and exposes each template's
**variable schema** (name + type) to the admin compose form.

IMPORTANT — template TEXT lives in two places, one per channel (this is by
design, not accidental duplication):
  * EMAIL (server-side)   -> the ``translations`` below.
  * IN-APP (client-side)  -> NextJS-Template/src/i18n/locales/{en,fr}/
                             broadcasts.json under ``templates.<key>``.
When you add/edit/remove a template, change BOTH places and keep the
``template_key`` and the placeholder variable names identical across them.

The data source is intentionally a plain module-level dict: the public helpers
below (``list_templates`` / ``get_template`` / ``render_template``) form a stable
interface, so a future "admin-managed templates" phase can swap the dict for a
DB table without touching any caller.
"""

from dataclasses import dataclass
from datetime import datetime

from babel.dates import format_datetime

from app.core.config import settings
from app.schemas.announcement import (
    AnnouncementContent,
    BroadcastTemplate,
    TemplateVariable,
    VariableType,
    VariableValue,
)
from app.schemas.user import Language


@dataclass(frozen=True)
class RenderedContent:
    """A template's title/body after placeholder substitution for one language."""

    title: str
    body: str


# The catalog. Each entry lists the placeholders it expects (name + type, so the
# compose form renders the right input and render-time formatting is correct) and
# the localized text for every supported language, with ``{placeholder}`` markers
# filled in at render time.
_TEMPLATES: dict[str, BroadcastTemplate] = {
    "maintenance": BroadcastTemplate(
        key="maintenance",
        variables=[
            TemplateVariable(name="starts_at", type=VariableType.DATETIME),
            TemplateVariable(name="ends_at", type=VariableType.DATETIME),
        ],
        translations={
            Language.FR: AnnouncementContent(
                title="Maintenance programmée",
                body="Le système sera en maintenance du {starts_at} au "
                "{ends_at} ; de brèves interruptions peuvent survenir.",
            ),
            Language.EN: AnnouncementContent(
                title="Scheduled Maintenance",
                body="The system will be under maintenance from {starts_at} to "
                "{ends_at}; brief interruptions may occur.",
            ),
        },
    ),
    "welcome": BroadcastTemplate(
        key="welcome",
        variables=[],
        translations={
            Language.FR: AnnouncementContent(
                title="Bienvenue",
                body="Bienvenue parmi nous ! Votre compte est prêt — complétez "
                "votre profil quand vous le souhaitez.",
            ),
            Language.EN: AnnouncementContent(
                title="Welcome",
                body="Welcome aboard! Your account is ready — complete your "
                "profile whenever you like.",
            ),
        },
    ),
    "new_feature": BroadcastTemplate(
        key="new_feature",
        variables=[TemplateVariable(name="feature", type=VariableType.TEXT)],
        translations={
            Language.FR: AnnouncementContent(
                title="Nouvelle fonctionnalité",
                body="Une nouvelle fonctionnalité est disponible : {feature}. "
                "Découvrez-la dès maintenant !",
            ),
            Language.EN: AnnouncementContent(
                title="New Feature",
                body="A new feature is now live: {feature}. Check it out!",
            ),
        },
    ),
    "security_notice": BroadcastTemplate(
        key="security_notice",
        variables=[],
        translations={
            Language.FR: AnnouncementContent(
                title="Avis de sécurité",
                body="Pour la sécurité de votre compte, nous vous recommandons de "
                "vérifier votre mot de passe et d'en utiliser un robuste.",
            ),
            Language.EN: AnnouncementContent(
                title="Security Notice",
                body="For your account's safety, we recommend reviewing your "
                "password and using a strong one.",
            ),
        },
    ),
}


class _SafeDict(dict):
    """A dict that leaves unknown ``{placeholders}`` untouched during format."""

    def __missing__(self, key: str) -> str:
        """Return the placeholder marker intact when the key is absent."""
        return "{" + key + "}"


def _format_datetime(value: str, language: Language) -> str:
    """Format an ISO datetime string for ``language`` in UTC; passthrough on error.

    Emails render server-side with no per-recipient timezone, so datetimes are
    shown in UTC with a literal ``UTC`` label to stay unambiguous. The in-app
    render localizes to each viewer's own timezone instead.
    """
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return str(value)
    return format_datetime(dt, "d MMMM y, HH:mm 'UTC'", locale=str(language))


def list_templates() -> list[BroadcastTemplate]:
    """Return every available template, for building the compose UI."""
    return list(_TEMPLATES.values())


def get_template(key: str) -> BroadcastTemplate | None:
    """Return the template named ``key``, or ``None`` if it does not exist."""
    return _TEMPLATES.get(key)


def template_exists(key: str) -> bool:
    """Whether ``key`` names a known template."""
    return key in _TEMPLATES


def render_template(
    key: str, language: Language, variables: dict[str, VariableValue]
) -> RenderedContent | None:
    """Render a template's title/body for ``language`` with ``variables`` filled.

    Each placeholder is resolved by its declared type: ``datetime`` values are
    locale-formatted, ``text`` values are picked per language (with fallback).
    Content language falls back to the default then any available one. Returns
    ``None`` for unknown keys.
    """
    template = _TEMPLATES.get(key)
    if template is None:
        return None

    default_lang = Language(settings.DEFAULT_LANGUAGE)
    content = (
        template.translations.get(language)
        or template.translations.get(default_lang)
        or next(iter(template.translations.values()))
    )

    types = {variable.name: variable.type for variable in template.variables}
    resolved: dict[str, str] = {}
    for name, value in (variables or {}).items():
        vtype = types.get(name)
        if vtype == VariableType.DATETIME and isinstance(value, str):
            resolved[name] = _format_datetime(value, language)
        elif vtype == VariableType.TEXT and isinstance(value, dict):
            resolved[name] = (
                value.get(language)
                or value.get(default_lang)
                or (next(iter(value.values())) if value else "")
            )
        else:
            resolved[name] = str(value)

    safe = _SafeDict(resolved)
    return RenderedContent(
        title=content.title.format_map(safe),
        body=content.body.format_map(safe),
    )
