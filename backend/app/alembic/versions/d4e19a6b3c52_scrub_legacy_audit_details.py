"""scrub PII and raw exception text from legacy audit details

Rows written before the audit hardening are never revisited by the
anonymization code, so this revision cleans ``user_activity.details`` once:

- rows about a user that no longer exists lose the PII keys;
- ``email_already_exists`` failures lose the PII keys (they named a third party);
- every row loses its ``error`` key, which may hold ``str(exc)``.

Data only. Runs online only: a fresh schema has nothing to scrub, and offline
SQL generation (``--sql``) skips it with a warning.

Revision ID: d4e19a6b3c52
Revises: c3d58e2f7a41
Create Date: 2026-11-06 18:00:00.000000

"""

import logging
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e19a6b3c52"
down_revision: str | Sequence[str] | None = "c3d58e2f7a41"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

logger = logging.getLogger(__name__)

# Frozen copy of ``ACTIVITY_PII_KEYS``: a migration must not follow later code.
_PII_KEYS = frozenset(
    {
        "email",
        "first_name",
        "last_name",
        "new_email",
        "ip_address",
        "subject",
        "filename",
    }
)
_BATCH_SIZE = 1000

_activity = sa.table(
    "user_activity",
    sa.column("id", sa.UUID()),
    sa.column("resource_type", sa.String()),
    sa.column("resource_id", sa.UUID()),
    sa.column("details", sa.JSON()),
)
_user = sa.table("user", sa.column("id", sa.UUID()))


def _scrubbed(details: object, target_is_gone: bool) -> dict | None:
    """Return the cleaned ``details``, or ``None`` when the row needs no rewrite."""
    if not isinstance(details, dict):
        return None
    removed = {"error"}
    if target_is_gone or details.get("reason") == "email_already_exists":
        removed |= _PII_KEYS
    kept = {key: value for key, value in details.items() if key not in removed}
    return kept if len(kept) != len(details) else None


def scrub_details(connection: sa.Connection) -> None:
    """Rewrite every affected ``user_activity`` row, in keyset-paginated batches."""
    target_is_gone = sa.and_(
        _activity.c.resource_type == "user",
        _activity.c.resource_id.is_not(None),
        _user.c.id.is_(None),
    ).label("target_is_gone")
    page = (
        sa.select(_activity.c.id, _activity.c.details, target_is_gone)
        .select_from(
            _activity.outerjoin(_user, _user.c.id == _activity.c.resource_id),
        )
        .order_by(_activity.c.id)
        .limit(_BATCH_SIZE)
    )
    update = (
        _activity.update()
        .where(_activity.c.id == sa.bindparam("row_id"))
        .values(details=sa.bindparam("new_details", type_=sa.JSON()))
    )

    last_id = None
    while True:
        stmt = page if last_id is None else page.where(_activity.c.id > last_id)
        rows = connection.execute(stmt).all()
        if not rows:
            return
        changes = [
            {"row_id": row.id, "new_details": cleaned}
            for row in rows
            if (cleaned := _scrubbed(row.details, bool(row.target_is_gone))) is not None
        ]
        if changes:
            connection.execute(update, changes)
        last_id = rows[-1].id


def upgrade() -> None:
    """Scrub legacy audit details (online only, see the module docstring)."""
    if op.get_context().as_sql:
        logger.warning("Skipping audit details scrub: it needs a live connection.")
        return
    scrub_details(op.get_bind())


def downgrade() -> None:
    """Do nothing: the removed values are gone and the schema did not change."""
