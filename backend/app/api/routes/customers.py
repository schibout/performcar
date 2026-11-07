"""Dealer customers: the customers of the caller's own dealership."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.api.deps import SessionDep, require_user_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.quote import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.customer_service import (
    create_customer_service,
    delete_customer_service,
    get_customer_service,
    list_customers_service,
    update_customer_service,
)
from app.use_cases.dealership_scope import require_dealership_scope

router = APIRouter()

CustomerReader = Annotated[
    User, Depends(require_user_permission(Permission.SELF_CUSTOMERS_READ))
]
CustomerCreator = Annotated[
    User, Depends(require_user_permission(Permission.SELF_CUSTOMERS_CREATE))
]
CustomerWriter = Annotated[
    User, Depends(require_user_permission(Permission.SELF_CUSTOMERS_WRITE))
]
CustomerDeleter = Annotated[
    User, Depends(require_user_permission(Permission.SELF_CUSTOMERS_DELETE))
]


@router.get("", response_model=CustomerListResponse)
async def list_my_customers(
    session: SessionDep,
    current_user: CustomerReader,
    search: Annotated[str | None, Query(max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CustomerListResponse:
    """List the customers of the caller's dealership."""
    return await list_customers_service(
        session,
        scope=require_dealership_scope(current_user),
        search=search.strip() if search else None,
        skip=skip,
        limit=limit,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_my_customer(
    customer_id: uuid.UUID, session: SessionDep, current_user: CustomerReader
) -> CustomerResponse:
    """Return one customer of the caller's dealership."""
    return await get_customer_service(
        session, scope=require_dealership_scope(current_user), customer_id=customer_id
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_my_customer(
    request: Request,
    payload: CustomerCreate,
    session: SessionDep,
    current_user: CustomerCreator,
) -> CustomerResponse:
    """Create a customer in the caller's dealership."""
    return await create_customer_service(
        session,
        actor=current_user,
        dealership_id=require_dealership_scope(current_user),
        payload=payload,
        request=request,
    )


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_my_customer(
    request: Request,
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    session: SessionDep,
    current_user: CustomerWriter,
) -> CustomerResponse:
    """Edit a customer of the caller's dealership."""
    return await update_customer_service(
        session,
        actor=current_user,
        scope=require_dealership_scope(current_user),
        customer_id=customer_id,
        payload=payload,
        request=request,
    )


@router.delete("/{customer_id}", response_model=Message)
async def delete_my_customer(
    request: Request,
    customer_id: uuid.UUID,
    session: SessionDep,
    current_user: CustomerDeleter,
) -> Message:
    """Delete a customer of the caller's dealership that has no quote."""
    return await delete_customer_service(
        session,
        actor=current_user,
        scope=require_dealership_scope(current_user),
        customer_id=customer_id,
        request=request,
    )
