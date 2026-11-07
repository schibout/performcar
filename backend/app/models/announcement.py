import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.schemas.common import JsonValue
from app.utils import utc_now

if TYPE_CHECKING:
    from app.models.user import User


class Announcement(Base):
    """A broadcast announcement composed by an admin and fanned out to users.

    Content is stored language-agnostically so it renders in each recipient's
    own locale: a ``template`` announcement carries a ``template_key`` plus
    ``variables`` (the frontend/email render the localized text from a catalog),
    while a ``custom`` announcement stores ``translations`` ({lang: {title,
    body}}) authored by the admin. The fan-out itself lives in ``notification``
    rows; this table is the source of truth for the admin history and the
    active banner.
    """

    __tablename__ = "announcement"
    __table_args__ = (
        # Admin history listing ("sent announcements, newest first") and the
        # active-banner lookup both scan by recency.
        Index("ix_announcement_created", "created_at"),
        # Active-banner lookup: WHERE show_banner = true ORDER BY created_at DESC.
        Index("ix_announcement_banner_created", "show_banner", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # "template" or "custom"; validated at the schema layer (no DB enum, so a new
    # kind never needs an ALTER TYPE migration — mirrors Notification.type).
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    # Set for kind="template": stable catalog key (e.g. "maintenance").
    template_key: Mapped[str | None] = mapped_column(String(100), default=None)
    # Set for kind="template": placeholder values ({"date": "...", "time": "..."}).
    variables: Mapped[dict[str, JsonValue]] = mapped_column(
        JSON, default=dict, nullable=False
    )
    # Set for kind="custom": admin-authored text per language
    # ({"fr": {"title": ..., "body": ...}, "en": {...}}).
    translations: Mapped[dict[str, JsonValue]] = mapped_column(
        JSON, default=dict, nullable=False
    )
    # Visual severity: "info" | "warning" | "critical". Plain string, validated
    # at the schema layer.
    level: Mapped[str] = mapped_column(String(20), default="info", nullable=False)
    # Target selector: "all" | "active" | "role".
    audience: Mapped[str] = mapped_column(String(20), default="all", nullable=False)
    # Set when audience="role": which role to target (e.g. "admin").
    role_filter: Mapped[str | None] = mapped_column(String(20), default=None)
    # Whether this announcement is surfaced as the top-of-page banner/modal.
    show_banner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Whether an email copy was requested at send time (audit/history only).
    send_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Author. SET NULL keeps the announcement (and its history row) readable
    # after the sending admin is deleted.
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"),
        default=None,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Sending admin, surfaced in the admin history ("sent by ...").
    creator: Mapped["User | None"] = relationship("User")
