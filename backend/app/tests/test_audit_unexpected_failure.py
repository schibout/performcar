"""Tests for the ``audit_unexpected_failure`` route decorator."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.decorators import audit_unexpected_failure
from app.models.user import User
from app.models.user_activity import UserActivity
from app.schemas.user_activity import ActivityStatus, ActivityType, ResourceType
from app.tests.admin.conftest import get_user_id, register_and_verify
from app.tests.conftest import TestingSessionLocal

ENDPOINT = "/test/endpoint"
SECRET_MESSAGE = "parameters: secret_encrypted=abc"


def _audited(func):
    """Apply the decorator with fixed test metadata."""
    return audit_unexpected_failure(
        activity_type=ActivityType.LOGIN,
        resource_type=ResourceType.AUTH,
        endpoint=ENDPOINT,
    )(func)


async def _rows() -> list[UserActivity]:
    """Return the audit rows written by the decorator."""
    async with TestingSessionLocal() as session:
        rows = (await session.execute(select(UserActivity))).scalars().all()
    return [r for r in rows if r.details.get("endpoint") == ENDPOINT]


@_audited
async def _fail(session: AsyncSession) -> None:  # noqa: ARG001
    """Raise an unexpected error whose message holds sensitive data."""
    raise RuntimeError(SECRET_MESSAGE)


@pytest.mark.asyncio
async def test_unknown_caller_is_audited_with_null_user_and_exception_type():
    """The row is written with no user, and never with the exception message."""
    async with TestingSessionLocal() as session:
        with pytest.raises(RuntimeError, match="secret_encrypted"):
            await _fail(session=session)

    rows = await _rows()
    assert len(rows) == 1
    assert rows[0].user_id is None
    assert rows[0].status == ActivityStatus.FAILURE
    assert rows[0].status_code == 500
    assert rows[0].details == {"error": "RuntimeError", "endpoint": ENDPOINT}


@pytest.mark.asyncio
async def test_known_caller_is_audited_and_pending_work_is_discarded(
    client: AsyncClient,
):
    """Uncommitted work of the failed request never reaches the audit commit."""
    await register_and_verify(client, "user@test.com")
    user_id = uuid.UUID(await get_user_id("user@test.com"))

    @_audited
    async def fail_after_write(session: AsyncSession, current_user: User) -> None:
        """Leave an uncommitted change on the session, then fail."""
        await session.execute(
            update(User).where(User.id == current_user.id).values(first_name="Ghost")
        )
        raise RuntimeError(SECRET_MESSAGE)

    async with TestingSessionLocal() as session:
        user = await session.get(User, user_id)
        with pytest.raises(RuntimeError):
            await fail_after_write(session=session, current_user=user)

    rows = await _rows()
    assert len(rows) == 1
    assert rows[0].user_id == user_id
    async with TestingSessionLocal() as session:
        assert (await session.get(User, user_id)).first_name != "Ghost"


@pytest.mark.asyncio
async def test_audit_failure_does_not_replace_the_original_exception():
    """A broken audit write leaves the route's own exception intact."""
    async with TestingSessionLocal() as session:
        with patch(
            "app.api.decorators.log_activity",
            new=AsyncMock(side_effect=ValueError("audit down")),
        ):
            with pytest.raises(RuntimeError, match="secret_encrypted"):
                await _fail(session=session)


@pytest.mark.asyncio
async def test_rollback_failure_does_not_replace_the_original_exception():
    """A session that cannot roll back leaves the route's exception intact."""
    session = AsyncMock(spec=AsyncSession)
    session.rollback.side_effect = ValueError("connection lost")

    with pytest.raises(RuntimeError, match="secret_encrypted"):
        await _fail(session=session)


@pytest.mark.asyncio
async def test_http_exception_passes_through_without_audit():
    """Expected HTTP errors are not treated as unexpected failures."""

    @_audited
    async def refuse(session: AsyncSession) -> None:  # noqa: ARG001
        """Raise an expected HTTP error."""
        raise HTTPException(status_code=403, detail="nope")

    async with TestingSessionLocal() as session:
        with pytest.raises(HTTPException):
            await refuse(session=session)

    assert await _rows() == []
