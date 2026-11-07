"""Dealer quotes: the quotes of the caller's own dealership."""

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, status

from app.api.deps import SessionDep, require_user_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.quote import (
    QuoteCreate,
    QuoteListResponse,
    QuoteResponse,
    QuoteSort,
    QuoteStatsResponse,
    QuoteStatus,
    QuoteUpdate,
    SortOrder,
)
from app.services.quote_service import (
    create_quote_service,
    delete_quote_service,
    get_quote_service,
    list_quotes_service,
    quote_stats_service,
    update_quote_service,
)
from app.use_cases.dealership_scope import require_dealership_scope

router = APIRouter()

QuoteReader = Annotated[
    User, Depends(require_user_permission(Permission.SELF_QUOTES_READ))
]
QuoteCreator = Annotated[
    User, Depends(require_user_permission(Permission.SELF_QUOTES_CREATE))
]
QuoteWriter = Annotated[
    User, Depends(require_user_permission(Permission.SELF_QUOTES_WRITE))
]
QuoteDeleter = Annotated[
    User, Depends(require_user_permission(Permission.SELF_QUOTES_DELETE))
]
Period = Literal["all", "today", "week", "month"]


@router.get("", response_model=QuoteListResponse)
async def list_my_quotes(
    session: SessionDep,
    current_user: QuoteReader,
    search: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[QuoteStatus | None, Query(alias="status")] = None,
    period: Period = "all",
    sort: QuoteSort = QuoteSort.DATE,
    order: SortOrder = SortOrder.DESC,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> QuoteListResponse:
    """List the quotes of the caller's dealership."""
    return await list_quotes_service(
        session,
        scope=require_dealership_scope(current_user),
        search=search,
        status_filter=status_filter,
        period=period,
        sort=sort,
        order=order,
        skip=skip,
        limit=limit,
    )


@router.get("/stats", response_model=QuoteStatsResponse)
async def my_quote_stats(
    session: SessionDep, current_user: QuoteReader
) -> QuoteStatsResponse:
    """Return the dashboard figures of the caller's dealership."""
    return await quote_stats_service(
        session, scope=require_dealership_scope(current_user)
    )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_my_quote(
    quote_id: uuid.UUID, session: SessionDep, current_user: QuoteReader
) -> QuoteResponse:
    """Return one quote of the caller's dealership."""
    return await get_quote_service(
        session, scope=require_dealership_scope(current_user), quote_id=quote_id
    )


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_my_quote(
    request: Request,
    payload: QuoteCreate,
    session: SessionDep,
    current_user: QuoteCreator,
) -> QuoteResponse:
    """Create a quote in the caller's dealership."""
    return await create_quote_service(
        session,
        actor=current_user,
        dealership_id=require_dealership_scope(current_user),
        payload=payload,
        request=request,
    )


@router.patch("/{quote_id}", response_model=QuoteResponse)
async def update_my_quote(
    request: Request,
    quote_id: uuid.UUID,
    payload: QuoteUpdate,
    session: SessionDep,
    current_user: QuoteWriter,
) -> QuoteResponse:
    """Edit a quote of the caller's dealership."""
    return await update_quote_service(
        session,
        actor=current_user,
        scope=require_dealership_scope(current_user),
        quote_id=quote_id,
        payload=payload,
        request=request,
    )


@router.delete("/{quote_id}", response_model=Message)
async def delete_my_quote(
    request: Request,
    quote_id: uuid.UUID,
    session: SessionDep,
    current_user: QuoteDeleter,
) -> Message:
    """Delete a quote of the caller's dealership."""
    return await delete_quote_service(
        session,
        actor=current_user,
        scope=require_dealership_scope(current_user),
        quote_id=quote_id,
        request=request,
    )
