import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.utils import utc_now


class UserMfa(Base):
    """TOTP enrollment of one user (one row per user).

    ``secret_encrypted`` is a Fernet token. ``enabled_at`` stays null until the
    first code is confirmed. ``last_used_step`` is the last accepted TOTP time
    step, used to refuse replays.
    """

    __tablename__ = "user_mfa"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    secret_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    enabled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    last_used_step: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class UserMfaRecoveryCode(Base):
    """One single-use recovery code, stored as an HMAC hash."""

    __tablename__ = "user_mfa_recovery_code"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
