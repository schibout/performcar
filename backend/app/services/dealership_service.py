"""Dealerships: the perimeter of dealers, managed from the admin panel."""

import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.dealership import Dealership
from app.models.user import User
from app.repositories.quote import (
    count_dealership_quotes,
    get_dealership,
    list_dealerships_with_counts,
)
from app.schemas.msg import Message
from app.schemas.quote import (
    DealershipCreate,
    DealershipListItem,
    DealershipListResponse,
    DealershipResponse,
    DealershipUpdate,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.dealership_scope import require_dealership_scope
from app.use_cases.log_activity import log_activity


async def _require_dealership(
    session: AsyncSession, dealership_id: uuid.UUID
) -> Dealership:
    """Return the dealership or raise 404."""
    dealership = await get_dealership(session, dealership_id)
    if dealership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.DEALERSHIP_NOT_FOUND,
        )
    return dealership


def _apply(dealership: Dealership, payload: DealershipUpdate) -> list[str]:
    """Copy the given fields onto the dealership and return their names."""
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("name") is None:
        changes.pop("name", None)
    for field, value in changes.items():
        setattr(dealership, field, value)
    return sorted(changes)


async def list_dealerships_service(session: AsyncSession) -> DealershipListResponse:
    """Return every dealership with its user and quote counts."""
    rows = await list_dealerships_with_counts(session)
    items = [
        DealershipListItem(
            **DealershipResponse.model_validate(dealership).model_dump(),
            user_count=users,
            quote_count=quotes,
        )
        for dealership, users, quotes in rows
    ]
    return DealershipListResponse(items=items, total=len(items))


async def get_dealership_service(
    session: AsyncSession, dealership_id: uuid.UUID
) -> DealershipResponse:
    """Return one dealership."""
    return DealershipResponse.model_validate(
        await _require_dealership(session, dealership_id)
    )


async def create_dealership_service(
    session: AsyncSession, *, actor: User, payload: DealershipCreate, request: Request
) -> DealershipResponse:
    """Create a dealership."""
    dealership = Dealership(**payload.model_dump())
    session.add(dealership)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.CREATE,
        ResourceType.DEALERSHIP,
        details={"name": dealership.name},
        resource_id=dealership.id,
        request=request,
    )
    return DealershipResponse.model_validate(dealership)


async def update_dealership_service(
    session: AsyncSession,
    *,
    actor: User,
    dealership_id: uuid.UUID,
    payload: DealershipUpdate,
    request: Request,
) -> DealershipResponse:
    """Edit any dealership (admin)."""
    dealership = await _require_dealership(session, dealership_id)
    fields = _apply(dealership, payload)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.UPDATE,
        ResourceType.DEALERSHIP,
        details={"fields": fields},
        resource_id=dealership.id,
        request=request,
    )
    await session.refresh(dealership)
    return DealershipResponse.model_validate(dealership)


async def delete_dealership_service(
    session: AsyncSession, *, actor: User, dealership_id: uuid.UUID, request: Request
) -> Message:
    """Delete a dealership without quotes; its users and customers are detached."""
    dealership = await _require_dealership(session, dealership_id)
    if await count_dealership_quotes(session, dealership_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorMessages.DEALERSHIP_IN_USE,
        )
    name = dealership.name
    await session.delete(dealership)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.DELETE,
        ResourceType.DEALERSHIP,
        details={"name": name},
        resource_id=dealership_id,
        request=request,
    )
    return Message(success=True, message=SuccessMessages.DEALERSHIP_DELETED)


async def get_my_dealership_service(
    session: AsyncSession, *, user: User
) -> DealershipResponse:
    """Return the caller's own dealership."""
    scope = require_dealership_scope(user)
    return DealershipResponse.model_validate(await _require_dealership(session, scope))


async def update_my_dealership_service(
    session: AsyncSession, *, user: User, payload: DealershipUpdate, request: Request
) -> DealershipResponse:
    """Edit the caller's own dealership details."""
    scope = require_dealership_scope(user)
    dealership = await _require_dealership(session, scope)
    fields = _apply(dealership, payload)
    await session.flush()
    await log_activity(
        session,
        user.id,
        ActivityType.UPDATE,
        ResourceType.DEALERSHIP,
        details={"fields": fields},
        resource_id=dealership.id,
        request=request,
    )
    await session.refresh(dealership)
    return DealershipResponse.model_validate(dealership)
