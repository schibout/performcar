import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_activity import UserActivity
from app.repositories.user_activity import create_user_activity
from app.schemas.user_activity import (
    ActivityStatus,
    ActivityType,
    ResourceType,
    UserActivityCreate,
)

# Import the test session maker from conftest
from app.tests.conftest import TestingSessionLocal
from app.use_cases.log_activity import log_activity


@pytest.fixture
async def db_session() -> AsyncSession:
    """Fixture that provides a fresh database session for a test."""
    async with TestingSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_create_user_activity(db_session: AsyncSession):
    """
    Test that a UserActivity can be successfully created and stored in the database.
    This doesn't use the API, but tests the underlying persistence and schemas directly.
    """
    # 1. First, we need a user in the database to link the activity to.
    fake_user_id = uuid.uuid4()
    test_user = User(
        id=fake_user_id,
        email="activity_test@example.com",
        hashed_password="hashed_dummy_password",
        is_active=True,
    )
    db_session.add(test_user)
    await db_session.commit()

    # 2. Prepare the activity data
    resource_id = uuid.uuid4()
    activity_data = UserActivityCreate(
        user_id=fake_user_id,
        activity_type=ActivityType.LOGIN,
        resource_type=ResourceType.AUTH,
        resource_id=resource_id,
        details={"ip": "127.0.0.1", "device": "Desktop"},
        status=ActivityStatus.SUCCESS,
        ip_address="127.0.0.1",
        user_agent="Mozilla/5.0",
    )

    # 3. Call the repository logic to create the activity
    activity = await create_user_activity(db_session, activity_data=activity_data)

    # 4. Verify it was created successfully and returned
    assert activity.id is not None
    assert activity.user_id == fake_user_id
    assert activity.activity_type == ActivityType.LOGIN.value
    assert activity.resource_type == ResourceType.AUTH.value
    assert activity.resource_id == resource_id
    assert activity.details == {"ip": "127.0.0.1", "device": "Desktop"}
    assert activity.status == ActivityStatus.SUCCESS.value
    assert activity.ip_address == "127.0.0.1"

    # 5. Make sure we can retrieve it from the database directly using SQLAlchemy (ORM)
    from sqlalchemy import select

    result = await db_session.execute(
        select(UserActivity).where(UserActivity.id == activity.id)
    )
    db_record = result.scalars().first()

    assert db_record is not None
    assert db_record.user_id == fake_user_id
    assert db_record.activity_type == ActivityType.LOGIN.value


@pytest.mark.asyncio
async def test_log_activity_defaults_success_status_code_to_200(
    db_session: AsyncSession,
):
    """log_activity should stamp successful entries with HTTP 200 by default."""
    user_id = uuid.uuid4()
    db_session.add(
        User(
            id=user_id,
            email="success_code@example.com",
            hashed_password="hashed_dummy_password",
            is_active=True,
        )
    )
    await db_session.commit()

    activity = await log_activity(
        session=db_session,
        user_id=user_id,
        activity_type=ActivityType.LOGIN,
        resource_type=ResourceType.AUTH,
    )

    assert activity.status == ActivityStatus.SUCCESS.value
    assert activity.status_code == 200


@pytest.mark.asyncio
async def test_log_activity_persists_failure_status_code(db_session: AsyncSession):
    """log_activity should persist the explicit status_code passed on failures."""
    user_id = uuid.uuid4()
    db_session.add(
        User(
            id=user_id,
            email="failure_code@example.com",
            hashed_password="hashed_dummy_password",
            is_active=True,
        )
    )
    await db_session.commit()

    activity = await log_activity(
        session=db_session,
        user_id=user_id,
        activity_type=ActivityType.LOGIN,
        resource_type=ResourceType.AUTH,
        status=ActivityStatus.FAILURE,
        status_code=401,
        details={"reason": "invalid_password"},
    )

    assert activity.status == ActivityStatus.FAILURE.value
    assert activity.status_code == 401


async def _seed_user_with_activity(email: str) -> tuple[uuid.UUID, uuid.UUID]:
    """Insert a user plus one PII-laden activity; return (user_id, activity_id)."""
    async with TestingSessionLocal() as session:
        user = User(
            email=email,
            hashed_password="hashed_dummy_password",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        activity = UserActivity(
            user_id=user.id,
            activity_type="login",
            resource_type="auth",
            details={
                "reason": "x",
                "email": email,
                "ip_address": "1.2.3.4",
                "subject": "My name is Jane",
                "filename": "jane-passport.pdf",
            },
            ip_address="1.2.3.4",
            user_agent="Mozilla/5.0",
        )
        session.add(activity)
        await session.commit()
        return user.id, activity.id


async def _get_activity(activity_id: uuid.UUID) -> UserActivity | None:
    """Reload an activity row with a fresh session."""
    async with TestingSessionLocal() as session:
        return await session.get(UserActivity, activity_id)


@pytest.mark.asyncio
async def test_hard_delete_keeps_anonymized_activity():
    """Hard-deleting a user keeps their audit rows, stripped of PII."""
    from app.core.security import actor_reference
    from app.repositories.user import hard_delete_user

    user_id, activity_id = await _seed_user_with_activity("anon-hard@test.com")
    async with TestingSessionLocal() as session:
        user = await session.get(User, user_id)
        await hard_delete_user(session, user)

    row = await _get_activity(activity_id)
    assert row.user_id is None and row.user_deleted_at is not None
    assert row.actor_ref == actor_reference(str(user_id))
    assert row.ip_address is None and row.user_agent is None
    assert row.details == {"reason": "x"}


@pytest.mark.asyncio
async def test_activity_about_deleted_user_loses_pii():
    """Rows by another actor about a deleted account lose PII but keep the actor."""
    from app.repositories.user import hard_delete_user

    target_id, _ = await _seed_user_with_activity("anon-target@test.com")
    admin_id, _ = await _seed_user_with_activity("anon-admin@test.com")
    async with TestingSessionLocal() as session:
        row = UserActivity(
            user_id=admin_id,
            activity_type="delete",
            resource_type="user",
            resource_id=target_id,
            details={"action": "admin_deleted_user", "email": "anon-target@test.com"},
            ip_address="9.9.9.9",
        )
        session.add(row)
        await session.commit()
        about_id = row.id
        user = await session.get(User, target_id)
        await hard_delete_user(session, user)

    row = await _get_activity(about_id)
    assert row.user_id == admin_id and "email" not in row.details
    assert row.details["action"] == "admin_deleted_user"
    assert row.ip_address == "9.9.9.9"
    assert row.user_deleted_at is None


@pytest.mark.asyncio
async def test_purge_keeps_rows_until_retention_elapses():
    """Anonymized rows are purged after the cutoff; live-account rows never are."""
    from datetime import timedelta

    from app.repositories.user_activity import purge_anonymized_activities
    from app.utils import utc_now

    now = utc_now()
    live_user, live_activity = await _seed_user_with_activity("purge-live@test.com")
    async with TestingSessionLocal() as session:
        live_row = await session.get(UserActivity, live_activity)
        live_row.created_at = now - timedelta(days=400)
        await session.commit()
    ids = {}
    async with TestingSessionLocal() as session:
        for name, days in (("recent", 364), ("old", 366)):
            row = UserActivity(
                user_id=None,
                actor_ref="a" * 64,
                activity_type="login",
                resource_type="auth",
                details={},
                user_deleted_at=now - timedelta(days=days),
            )
            session.add(row)
            await session.flush()
            ids[name] = row.id
        # Unknown-email row (never had an account), old by created_at only.
        row = UserActivity(
            user_id=None,
            actor_ref="b" * 64,
            activity_type="login",
            resource_type="auth",
            details={},
            created_at=now - timedelta(days=400),
        )
        session.add(row)
        await session.flush()
        ids["unknown_old"] = row.id
        await session.commit()

    async with TestingSessionLocal() as session:
        purged = await purge_anonymized_activities(
            session, cutoff=now - timedelta(days=365), batch_size=1
        )
    assert purged == 2
    assert await _get_activity(ids["recent"]) is not None
    assert await _get_activity(ids["old"]) is None
    assert await _get_activity(ids["unknown_old"]) is None
    assert await _get_activity(live_activity) is not None


@pytest.mark.asyncio
async def test_anonymize_pages_beyond_one_batch(monkeypatch: pytest.MonkeyPatch):
    """Every row is scrubbed when a trail is larger than one rewrite batch."""
    from app.core.security import actor_reference
    from app.repositories import user_activity as repo
    from app.utils import utc_now

    monkeypatch.setattr(repo, "_ANONYMIZE_BATCH_SIZE", 2)
    target_id, first_own = await _seed_user_with_activity("paging-target@test.com")
    actor_id, _ = await _seed_user_with_activity("paging-actor@test.com")
    async with TestingSessionLocal() as session:
        own_rows = [
            UserActivity(
                user_id=target_id,
                activity_type="login",
                resource_type="auth",
                details={"email": "paging-target@test.com"},
                ip_address="1.2.3.4",
            )
            for _ in range(4)
        ]
        about_rows = [
            UserActivity(
                user_id=actor_id,
                activity_type="update",
                resource_type="user",
                resource_id=target_id,
                details={"email": "paging-target@test.com", "action": "x"},
            )
            for _ in range(5)
        ]
        session.add_all([*own_rows, *about_rows])
        await session.commit()
        own_ids = [first_own, *(row.id for row in own_rows)]
        about_ids = [row.id for row in about_rows]

        await repo.anonymize_user_activities(session, [target_id], utc_now())
        await session.commit()

    for activity_id in own_ids:
        row = await _get_activity(activity_id)
        assert row.actor_ref == actor_reference(str(target_id))
        assert row.ip_address is None and "email" not in row.details
    for activity_id in about_ids:
        row = await _get_activity(activity_id)
        assert row.details == {"action": "x"}


@pytest.mark.asyncio
async def test_anonymize_first_locks_the_accounts(monkeypatch: pytest.MonkeyPatch):
    """The accounts are locked before any audit row is read (FK insert race)."""
    from sqlalchemy.dialects import postgresql

    from app.repositories.user_activity import anonymize_user_activities
    from app.utils import utc_now

    user_id, _ = await _seed_user_with_activity("lock-first@test.com")
    statements = []
    async with TestingSessionLocal() as session:
        real_execute = session.execute

        async def spy(statement, *args, **kwargs):
            """Record each statement before running it (SQLite drops FOR UPDATE)."""
            statements.append(statement)
            return await real_execute(statement, *args, **kwargs)

        monkeypatch.setattr(session, "execute", spy)
        await anonymize_user_activities(session, [user_id], utc_now())
        await session.rollback()

    first = str(statements[0].compile(dialect=postgresql.dialect()))
    assert 'FROM "user"' in first and "FOR UPDATE" in first


@pytest.mark.asyncio
async def test_purge_job_removes_only_expired_rows(monkeypatch: pytest.MonkeyPatch):
    """The cron job purges past the configured retention and reports the count."""
    from datetime import timedelta

    from app.core.config import settings
    from app.utils import utc_now
    from app.worker.jobs import purge_anonymized_activities as job_module

    monkeypatch.setattr(job_module, "AsyncSessionLocal", TestingSessionLocal)
    retention = settings.ANONYMIZED_AUDIT_RETENTION_DAYS
    now = utc_now()
    async with TestingSessionLocal() as session:
        expired, kept = [
            UserActivity(
                user_id=None,
                actor_ref="d" * 64,
                activity_type="login",
                resource_type="auth",
                details={},
                user_deleted_at=now - timedelta(days=retention + delta),
            )
            for delta in (1, -1)
        ]
        session.add_all([expired, kept])
        await session.commit()
        expired_id, kept_id = expired.id, kept.id

    result = await job_module.purge_anonymized_activities({})

    assert result.purged == 1
    assert await _get_activity(expired_id) is None
    assert await _get_activity(kept_id) is not None


def test_purge_job_is_registered_on_its_cron_schedule():
    """The worker declares the purge job and runs it at the configured time."""
    from app.core.config import settings
    from app.worker.jobs.purge_anonymized_activities import (
        purge_anonymized_activities,
    )
    from app.worker.settings import WorkerSettings

    assert purge_anonymized_activities in WorkerSettings.functions
    crons = [
        job
        for job in WorkerSettings.cron_jobs
        if job.coroutine is purge_anonymized_activities
    ]
    assert len(crons) == 1
    assert crons[0].hour == {settings.AUDIT_PURGE_CRON_HOUR}
    assert crons[0].minute == {settings.AUDIT_PURGE_CRON_MINUTE}
