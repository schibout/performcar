"""Tests for the data-only migration scrubbing legacy audit details."""

import importlib.util
import uuid
from pathlib import Path
from types import ModuleType

import pytest

from app.models.user import User
from app.models.user_activity import UserActivity
from app.tests.conftest import TestingSessionLocal

_MIGRATION = (
    Path(__file__).parents[1]
    / "alembic"
    / "versions"
    / "d4e19a6b3c52_scrub_legacy_audit_details.py"
)


def _load_migration() -> ModuleType:
    """Import the migration module from its file (``versions`` is no package)."""
    spec = importlib.util.spec_from_file_location("scrub_migration", _MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def _seed(session, **fields) -> uuid.UUID:
    """Insert one activity row with defaults and return its id."""
    row = UserActivity(activity_type="update", **fields)
    session.add(row)
    await session.flush()
    return row.id


@pytest.mark.asyncio
async def test_scrub_rewrites_only_the_targeted_rows(monkeypatch: pytest.MonkeyPatch):
    """Orphans and conflicts lose PII, ``error`` goes, everything else is intact."""
    migration = _load_migration()
    monkeypatch.setattr(migration, "_BATCH_SIZE", 2)
    pii = {"email": "x@test.com", "subject": "s", "filename": "f", "new_email": "y"}

    async with TestingSessionLocal() as session:
        living = User(email="scrub-living@test.com", hashed_password="x")
        session.add(living)
        await session.flush()
        common = {"user_id": living.id, "resource_type": "user"}
        ids = {
            "orphan": await _seed(
                session,
                **common,
                resource_id=uuid.uuid4(),
                details={"action": "keep", **pii},
            ),
            "about_living": await _seed(
                session, **common, resource_id=living.id, details=dict(pii)
            ),
            "no_target": await _seed(session, **common, details=dict(pii)),
            "conflict": await _seed(
                session,
                user_id=living.id,
                resource_type="auth",
                details={"reason": "email_already_exists", "email": "z@test.com"},
            ),
            "error": await _seed(
                session,
                user_id=living.id,
                resource_type="file",
                details={"error": "boom for x@test.com", "filename": "kept.pdf"},
            ),
            "empty_after": await _seed(
                session,
                user_id=living.id,
                resource_type="file",
                details={"error": "boom"},
            ),
            "untouched": await _seed(
                session,
                user_id=living.id,
                resource_type="support_ticket",
                details={"subject": "kept"},
            ),
        }
        await session.commit()

        connection = await session.connection()
        await connection.run_sync(migration.scrub_details)
        await session.commit()

    async with TestingSessionLocal() as session:
        details = {
            name: (await session.get(UserActivity, activity_id)).details
            for name, activity_id in ids.items()
        }
    assert details == {
        "orphan": {"action": "keep"},
        "about_living": pii,
        "no_target": pii,
        "conflict": {"reason": "email_already_exists"},
        "error": {"filename": "kept.pdf"},
        "empty_after": {},
        "untouched": {"subject": "kept"},
    }
