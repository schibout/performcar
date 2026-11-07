import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.messages.error_message import ErrorMessages
from app.schemas.user import Language, SystemRole


class AnnouncementKind(StrEnum):
    """How an announcement's content is sourced."""

    TEMPLATE = "template"  # text rendered from the backend catalog + variables
    CUSTOM = "custom"  # admin-authored text, stored per language


class AnnouncementLevel(StrEnum):
    """Visual severity of an announcement."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AnnouncementAudience(StrEnum):
    """Which users an announcement is fanned out to."""

    ALL = "all"
    ACTIVE = "active"  # only active accounts
    ROLE = "role"  # only users holding ``role_filter``


class VariableType(StrEnum):
    """The kind of value a template variable holds (drives input + formatting)."""

    TEXT = "text"  # localized per language: {"fr": ..., "en": ...}
    DATETIME = "datetime"  # a single ISO instant, formatted per locale at render


# A submitted variable value: a single neutral value (a datetime as an ISO
# string) or a per-language map for free text.
VariableValue = str | dict[Language, str]


# Per-language content limits — kept short so the banner stays single-line on
# desktop and the modal readable on mobile.
TITLE_MAX_LENGTH = 120
BODY_MAX_LENGTH = 600


class AnnouncementContent(BaseModel):
    """Admin-authored title/body for a single language (custom announcements)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=TITLE_MAX_LENGTH)
    body: str = Field(min_length=1, max_length=BODY_MAX_LENGTH)


class BroadcastCreate(BaseModel):
    """Admin payload to compose and send a broadcast announcement.

    Exactly one content source is used: ``template`` announcements carry a
    ``template_key`` + ``variables`` (text comes from the backend catalog),
    while ``custom`` announcements carry ``translations`` keyed by language.
    Content is stored language-agnostically so each recipient sees it in their
    own locale.
    """

    model_config = ConfigDict(extra="forbid")

    kind: AnnouncementKind
    # Template mode:
    template_key: str | None = Field(default=None, max_length=100)
    # Template placeholder values, keyed by variable name. A datetime value is a
    # single ISO string; a text value is a per-language map. The variable's type
    # (from the catalog) decides which shape applies.
    variables: dict[str, VariableValue] = Field(default_factory=dict)
    # Custom mode: at least one language; missing languages fall back at render.
    translations: dict[Language, AnnouncementContent] = Field(default_factory=dict)
    # Presentation + targeting:
    level: AnnouncementLevel = AnnouncementLevel.INFO
    audience: AnnouncementAudience = AnnouncementAudience.ALL
    role_filter: SystemRole | None = None
    show_banner: bool = False
    send_email: bool = False

    @model_validator(mode="after")
    def _check_consistency(self) -> "BroadcastCreate":
        """Enforce that the chosen kind/audience carry their required fields."""
        if self.kind == AnnouncementKind.TEMPLATE:
            if not self.template_key:
                raise ValueError(ErrorMessages.ANNOUNCEMENT_INVALID_CONTENT)
            if self.translations:
                raise ValueError(ErrorMessages.ANNOUNCEMENT_INVALID_CONTENT)
        else:  # CUSTOM
            if not self.translations:
                raise ValueError(ErrorMessages.ANNOUNCEMENT_INVALID_CONTENT)
            if self.template_key:
                raise ValueError(ErrorMessages.ANNOUNCEMENT_INVALID_CONTENT)

        if self.audience == AnnouncementAudience.ROLE and self.role_filter is None:
            raise ValueError(ErrorMessages.ANNOUNCEMENT_INVALID_AUDIENCE)
        if self.audience != AnnouncementAudience.ROLE and self.role_filter is not None:
            raise ValueError(ErrorMessages.ANNOUNCEMENT_INVALID_AUDIENCE)
        return self


class AnnouncementCreator(BaseModel):
    """Minimal identity of the admin who sent an announcement."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None


class AnnouncementRead(BaseModel):
    """An announcement as returned by the admin history and the active banner."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: AnnouncementKind
    template_key: str | None = None
    variables: dict[str, VariableValue] = Field(default_factory=dict)
    translations: dict[Language, AnnouncementContent] = Field(default_factory=dict)
    level: AnnouncementLevel
    audience: AnnouncementAudience
    role_filter: SystemRole | None = None
    show_banner: bool
    send_email: bool
    created_by: uuid.UUID | None = None
    creator: AnnouncementCreator | None = None
    created_at: datetime


class BroadcastCreateResponse(BaseModel):
    """Response after a broadcast is composed and fanned out."""

    announcement: AnnouncementRead
    recipients: int
    message: str


class AnnouncementListResponse(BaseModel):
    """Paginated admin history of sent announcements."""

    data: list[AnnouncementRead]
    total: int
    skip: int
    limit: int


class ActiveBannerResponse(BaseModel):
    """The currently active banner announcement, or ``None``."""

    announcement: AnnouncementRead | None = None


class TemplateVariable(BaseModel):
    """A single placeholder a template expects, with its value type."""

    name: str
    type: VariableType


class BroadcastTemplate(BaseModel):
    """A reusable announcement template surfaced to the admin compose UI."""

    key: str
    variables: list[TemplateVariable] = Field(default_factory=list)
    translations: dict[Language, AnnouncementContent]


class BroadcastTemplateCatalogResponse(BaseModel):
    """All available broadcast templates, for building the compose form."""

    templates: list[BroadcastTemplate]
