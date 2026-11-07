"""Customers of a dealership.

``scope`` is the dealership perimeter: the caller's dealership for a dealer,
``None`` (every dealership) for the admin panel. A customer outside the scope
answers 404, exactly like a missing one, so ids cannot be probed.
"""

import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.quote import Customer
from app.models.user import User
from app.repositories.quote import count_customer_quotes, get_customer, list_customers
from app.schemas.msg import Message
from app.schemas.quote import (
    CustomerCreate,
    CustomerListItem,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.dealership_scope import ensure_in_scope
from app.use_cases.log_activity import log_activity


async def _require_customer(
    session: AsyncSession, customer_id: uuid.UUID, scope: uuid.UUID | None
) -> Customer:
    """Return the customer when it exists inside the scope, else raise 404."""
    customer = await get_customer(session, customer_id)
    if customer is None or not ensure_in_scope(customer.dealership_id, scope):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.CUSTOMER_NOT_FOUND,
        )
    return customer


async def list_customers_service(
    session: AsyncSession,
    *,
    scope: uuid.UUID | None,
    search: str | None,
    skip: int,
    limit: int,
) -> CustomerListResponse:
    """Return a page of the scope's customers."""
    rows, total = await list_customers(
        session, dealership_id=scope, search=search, skip=skip, limit=limit
    )
    return CustomerListResponse(
        items=[
            CustomerListItem(
                **CustomerResponse.model_validate(customer).model_dump(),
                quote_count=count,
            )
            for customer, count in rows
        ],
        total=total,
    )


async def get_customer_service(
    session: AsyncSession, *, scope: uuid.UUID | None, customer_id: uuid.UUID
) -> CustomerResponse:
    """Return one customer of the scope."""
    return CustomerResponse.model_validate(
        await _require_customer(session, customer_id, scope)
    )


async def create_customer_service(
    session: AsyncSession,
    *,
    actor: User,
    dealership_id: uuid.UUID,
    payload: CustomerCreate,
    request: Request,
) -> CustomerResponse:
    """Create a customer in the given dealership."""
    customer = Customer(**payload.model_dump(), dealership_id=dealership_id)
    session.add(customer)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.CREATE,
        ResourceType.CUSTOMER,
        resource_id=customer.id,
        request=request,
    )
    return CustomerResponse.model_validate(customer)


async def update_customer_service(
    session: AsyncSession,
    *,
    actor: User,
    scope: uuid.UUID | None,
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    request: Request,
) -> CustomerResponse:
    """Edit a customer of the scope."""
    customer = await _require_customer(session, customer_id, scope)
    changes = payload.model_dump(exclude_unset=True)
    for field in ("first_name", "last_name"):
        if field in changes and changes[field] is None:
            changes.pop(field)
    for field, value in changes.items():
        setattr(customer, field, value)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.UPDATE,
        ResourceType.CUSTOMER,
        details={"fields": sorted(changes)},
        resource_id=customer.id,
        request=request,
    )
    await session.refresh(customer)
    return CustomerResponse.model_validate(customer)


async def delete_customer_service(
    session: AsyncSession,
    *,
    actor: User,
    scope: uuid.UUID | None,
    customer_id: uuid.UUID,
    request: Request,
) -> Message:
    """Delete a customer of the scope that has no quote."""
    customer = await _require_customer(session, customer_id, scope)
    if await count_customer_quotes(session, customer_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorMessages.CUSTOMER_HAS_QUOTES,
        )
    await session.delete(customer)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.DELETE,
        ResourceType.CUSTOMER,
        resource_id=customer_id,
        request=request,
    )
    return Message(success=True, message=SuccessMessages.CUSTOMER_DELETED)
