import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.utils import utc_now

if TYPE_CHECKING:
    from app.models.user import User


class SystemSetting(Base):
    """An admin-overridden value for a setting defined in the registry.

    Only settings whose value differs from the registry/env default have a row
    here; a missing row means the default applies. ``key`` matches a key in
    ``app.core.settings_registry``; ``value`` is the serialised string form
    (parsed back to its typed value via the registry). Type, category, default
    and public visibility are NOT stored here — the registry is their single
    source of truth, so settings never drift between code and database.
    """

    __tablename__ = "system_setting"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Registry key (e.g. "maintenance_mode"). Unique: at most one override row
    # per setting. The unique constraint also creates the lookup index.
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    # Serialised value ("true"/"42"/free text). Text, not String(n): the
    # maintenance message has no natural length cap.
    value: Mapped[str] = mapped_column(Text, nullable=False)
    # Admin who last changed it. SET NULL keeps the override readable after the
    # admin account is deleted.
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), default=None
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Admin who last changed the value, surfaced in the admin settings UI.
    updater: Mapped["User | None"] = relationship("User")
