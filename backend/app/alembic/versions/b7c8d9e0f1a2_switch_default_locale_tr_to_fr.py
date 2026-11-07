"""switch default_locale setting from tr to fr

Supported languages are now French + English (fr, en). An admin-overridden
``default_locale`` row still holding the removed ``tr`` value would fail
validation, so it is migrated to ``fr`` (the business language).

Revision ID: b7c8d9e0f1a2
Revises: f1a2b3c4d5e6
Create Date: 2026-11-07 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c8d9e0f1a2"
down_revision: str | Sequence[str] | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Rewrite a stored ``default_locale`` override of ``tr`` to ``fr``."""
    op.execute(
        "UPDATE system_setting SET value = 'fr' "
        "WHERE key = 'default_locale' AND value = 'tr'"
    )


def downgrade() -> None:
    """Restore a stored ``default_locale`` override of ``fr`` back to ``tr``."""
    op.execute(
        "UPDATE system_setting SET value = 'tr' "
        "WHERE key = 'default_locale' AND value = 'fr'"
    )
