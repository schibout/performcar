"""keep anonymized user_activity rows after account deletion

Revision ID: b7c41d9e5a10
Revises: a2290a6fbc7f
Create Date: 2026-11-06 09:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c41d9e5a10"
down_revision: str | Sequence[str] | None = "a2290a6fbc7f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Make user_id nullable with ON DELETE SET NULL and add anonymization columns."""
    op.add_column(
        "user_activity", sa.Column("actor_ref", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "user_activity",
        sa.Column("user_deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_user_activity_actor_ref"), "user_activity", ["actor_ref"])
    op.create_index(
        op.f("ix_user_activity_user_deleted_at"), "user_activity", ["user_deleted_at"]
    )
    op.alter_column("user_activity", "user_id", existing_type=sa.UUID(), nullable=True)
    op.drop_constraint(
        "user_activity_user_id_fkey", "user_activity", type_="foreignkey"
    )
    op.create_foreign_key(
        "user_activity_user_id_fkey",
        "user_activity",
        "user",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Drop orphaned rows, restore NOT NULL + CASCADE and remove the new columns."""
    op.execute("DELETE FROM user_activity WHERE user_id IS NULL")
    op.drop_constraint(
        "user_activity_user_id_fkey", "user_activity", type_="foreignkey"
    )
    op.create_foreign_key(
        "user_activity_user_id_fkey",
        "user_activity",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("user_activity", "user_id", existing_type=sa.UUID(), nullable=False)
    op.drop_index(op.f("ix_user_activity_user_deleted_at"), table_name="user_activity")
    op.drop_index(op.f("ix_user_activity_actor_ref"), table_name="user_activity")
    op.drop_column("user_activity", "user_deleted_at")
    op.drop_column("user_activity", "actor_ref")
