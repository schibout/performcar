"""add user_mfa and user_mfa_recovery_code

Revision ID: c3d58e2f7a41
Revises: b7c41d9e5a10
Create Date: 2026-11-06 11:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d58e2f7a41"
down_revision: str | Sequence[str] | None = "b7c41d9e5a10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the TOTP enrollment and recovery code tables."""
    op.create_table(
        "user_mfa",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("secret_encrypted", sa.Text(), nullable=False),
        sa.Column("enabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_step", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "user_mfa_recovery_code",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_mfa_recovery_code_user_id"),
        "user_mfa_recovery_code",
        ["user_id"],
    )


def downgrade() -> None:
    """Drop the recovery code and enrollment tables."""
    op.drop_index(
        op.f("ix_user_mfa_recovery_code_user_id"), table_name="user_mfa_recovery_code"
    )
    op.drop_table("user_mfa_recovery_code")
    op.drop_table("user_mfa")
