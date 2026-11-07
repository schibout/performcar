"""add RBAC tables and give every account the default role

Creates the role and permission-set tables, seeds the ``user`` role row and
assigns it to every existing account, whatever its tier. The application
completes the catalog (other roles, every set, memberships) at startup through
``ensure_rbac_catalog``. Existing ``admin_permission`` grants are not touched.

Revision ID: e7a3c15b9f20
Revises: d4e19a6b3c52
Create Date: 2026-11-06 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e7a3c15b9f20"
down_revision: str | Sequence[str] | None = "d4e19a6b3c52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy of app.core.rbac_catalog.DEFAULT_USER_ROLE_ID (a test keeps them
# equal): migrations import nothing from the application.
DEFAULT_USER_ROLE_ID = "7c1f4e2a-9b3d-4a56-8e01-3d5f6a7b8c90"


def upgrade() -> None:
    """Create the RBAC tables and backfill the default role."""
    op.create_table(
        "rbac_permission_set",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("audience", sa.String(length=20), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "rbac_permission_set_item",
        sa.Column("set_id", sa.Uuid(), nullable=False),
        sa.Column("permission", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(
            ["set_id"], ["rbac_permission_set.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("set_id", "permission"),
    )
    op.create_table(
        "rbac_role",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("audience", sa.String(length=20), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "rbac_role_permission_set",
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("set_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["rbac_role.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["set_id"], ["rbac_permission_set.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("role_id", "set_id"),
    )
    op.create_index(
        op.f("ix_rbac_role_permission_set_set_id"),
        "rbac_role_permission_set",
        ["set_id"],
        unique=False,
    )
    op.create_table(
        "rbac_user_role",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_by", sa.Uuid(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["role_id"], ["rbac_role.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "role_id", name="uq_rbac_user_role_user_role"),
    )
    op.create_index(
        op.f("ix_rbac_user_role_role_id"), "rbac_user_role", ["role_id"], unique=False
    )
    op.create_table(
        "rbac_user_permission_set",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("set_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_by", sa.Uuid(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["set_id"], ["rbac_permission_set.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "set_id", name="uq_rbac_user_permission_set"),
    )
    op.create_index(
        op.f("ix_rbac_user_permission_set_set_id"),
        "rbac_user_permission_set",
        ["set_id"],
        unique=False,
    )

    op.execute(
        f"""
        INSERT INTO rbac_role
            (id, key, name, audience, is_system, created_at, updated_at)
        VALUES
            ('{DEFAULT_USER_ROLE_ID}', 'user', 'User', 'user', true, now(), now())
        ON CONFLICT DO NOTHING
        """
    )
    op.execute(
        f"""
        INSERT INTO rbac_user_role (id, user_id, role_id, created_at)
        SELECT gen_random_uuid(), id, '{DEFAULT_USER_ROLE_ID}', now()
        FROM "user"
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    """Drop the RBAC tables, dependents first."""
    op.drop_index(
        op.f("ix_rbac_user_permission_set_set_id"),
        table_name="rbac_user_permission_set",
    )
    op.drop_table("rbac_user_permission_set")
    op.drop_index(op.f("ix_rbac_user_role_role_id"), table_name="rbac_user_role")
    op.drop_table("rbac_user_role")
    op.drop_index(
        op.f("ix_rbac_role_permission_set_set_id"),
        table_name="rbac_role_permission_set",
    )
    op.drop_table("rbac_role_permission_set")
    op.drop_table("rbac_role")
    op.drop_table("rbac_permission_set_item")
    op.drop_table("rbac_permission_set")
