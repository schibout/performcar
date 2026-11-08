"""add AI assistant conversations

Revision ID: c4e8a1f2b3d7
Revises: b7c8d9e0f1a2
Create Date: 2026-11-07 17:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c4e8a1f2b3d7"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the assistant conversation and message tables."""
    op.create_table(
        "assistant_conversation",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_assistant_conversation_user_kind_updated",
        "assistant_conversation",
        ["user_id", "kind", "updated_at"],
    )
    op.create_table(
        "assistant_message",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=12), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["assistant_conversation.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_assistant_message_conversation_created",
        "assistant_message",
        ["conversation_id", "created_at"],
    )


def downgrade() -> None:
    """Drop the assistant tables."""
    op.drop_index(
        "ix_assistant_message_conversation_created", table_name="assistant_message"
    )
    op.drop_table("assistant_message")
    op.drop_index(
        "ix_assistant_conversation_user_kind_updated",
        table_name="assistant_conversation",
    )
    op.drop_table("assistant_conversation")
