import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.utils import utc_now


class RbacPermissionSet(Base):
    """A named bundle of permission keys, grantable directly or through a role."""

    __tablename__ = "rbac_permission_set"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), default=None)
    audience: Mapped[str] = mapped_column(String(20), nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class RbacPermissionSetItem(Base):
    """One permission key held by a permission set."""

    __tablename__ = "rbac_permission_set_item"

    set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rbac_permission_set.id", ondelete="CASCADE"), primary_key=True
    )
    permission: Mapped[str] = mapped_column(String(50), primary_key=True)


class RbacRole(Base):
    """A named bundle of permission sets assignable to accounts.

    Superadmins have no row here: that tier stays defined by ``user.role``.
    """

    __tablename__ = "rbac_role"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), default=None)
    audience: Mapped[str] = mapped_column(String(20), nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class RbacRolePermissionSet(Base):
    """Membership of a permission set in a role."""

    __tablename__ = "rbac_role_permission_set"

    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rbac_role.id", ondelete="CASCADE"), primary_key=True
    )
    # RESTRICT: a set still used by a role cannot be deleted.
    set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rbac_permission_set.id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    )


class RbacUserRole(Base):
    """Assignment of a role to an account, optionally until ``expires_at``."""

    __tablename__ = "rbac_user_role"
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_rbac_user_role_user_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    # RESTRICT: a role still assigned to an account cannot be deleted.
    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rbac_role.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), default=None
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class RbacUserPermissionSet(Base):
    """Direct assignment of a set to an account, optionally until ``expires_at``."""

    __tablename__ = "rbac_user_permission_set"
    __table_args__ = (
        UniqueConstraint("user_id", "set_id", name="uq_rbac_user_permission_set"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    # RESTRICT: a set still assigned to an account cannot be deleted.
    set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rbac_permission_set.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), default=None
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
