"""Admin quotes and customers: every dealership's data."""

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import SessionDep, require_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.quote import (
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
    QuoteListResponse,
    QuoteResponse,
    QuoteSort,
    QuoteStatsResponse,
    QuoteStatus,
    QuoteUpdate,
    SortOrder,
)
from app.services.customer_service import (
    delete_customer_service,
    get_customer_service,
    list_customers_service,
    update_customer_service,
)
from app.services.quote_service import (
    delete_quote_service,
    get_quote_service,
    list_quotes_service,
    quote_stats_service,
    update_quote_service,
)

router = APIRouter()

QuotesRead = Annotated[User, Depends(require_permission(Permission.QUOTES_READ))]
QuotesWrite = Annotated[User, Depends(require_permission(Permission.QUOTES_WRITE))]
QuotesDelete = Annotated[User, Depends(require_permission(Permission.QUOTES_DELETE))]
CustomersRead = Annotated[User, Depends(require_permission(Permission.CUSTOMERS_READ))]
CustomersWrite = Annotated[
    User, Depends(require_permission(Permission.CUSTOMERS_WRITE))
]
CustomersDelete = Annotated[
    User, Depends(require_permission(Permission.CUSTOMERS_DELETE))
]
Period = Literal["all", "today", "week", "month"]


@router.get("/quotes", response_model=QuoteListResponse)
async def admin_list_quotes(
    session: SessionDep,
    _admin: QuotesRead,
    dealership_id: uuid.UUID | None = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[QuoteStatus | None, Query(alias="status")] = None,
    period: Period = "all",
    sort: QuoteSort = QuoteSort.DATE,
    order: SortOrder = SortOrder.DESC,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> QuoteListResponse:
    """List the quotes of every dealership, or of one."""
    return await list_quotes_service(
        session,
        scope=dealership_id,
        search=search,
        status_filter=status_filter,
        period=period,
        sort=sort,
        order=order,
        skip=skip,
        limit=limit,
    )


@router.get("/quotes/stats", response_model=QuoteStatsResponse)
async def admin_quote_stats(
    session: SessionDep, _admin: QuotesRead, dealership_id: uuid.UUID | None = None
) -> QuoteStatsResponse:
    """Return the dashboard figures of every dealership, or of one."""
    return await quote_stats_service(session, scope=dealership_id)


@router.get("/quotes/{quote_id}", response_model=QuoteResponse)
async def admin_get_quote(
    quote_id: uuid.UUID, session: SessionDep, _admin: QuotesRead
) -> QuoteResponse:
    """Return any quote."""
    return await get_quote_service(session, scope=None, quote_id=quote_id)


@router.patch("/quotes/{quote_id}", response_model=QuoteResponse)
async def admin_update_quote(
    request: Request,
    quote_id: uuid.UUID,
    payload: QuoteUpdate,
    session: SessionDep,
    admin: QuotesWrite,
) -> QuoteResponse:
    """Edit any quote."""
    return await update_quote_service(
        session,
        actor=admin,
        scope=None,
        quote_id=quote_id,
        payload=payload,
        request=request,
    )


@router.delete("/quotes/{quote_id}", response_model=Message)
async def admin_delete_quote(
    request: Request, quote_id: uuid.UUID, session: SessionDep, admin: QuotesDelete
) -> Message:
    """Delete any quote."""
    return await delete_quote_service(
        session, actor=admin, scope=None, quote_id=quote_id, request=request
    )


@router.get("/customers", response_model=CustomerListResponse)
async def admin_list_customers(
    session: SessionDep,
    _admin: CustomersRead,
    dealership_id: uuid.UUID | None = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CustomerListResponse:
    """List the customers of every dealership, or of one."""
    return await list_customers_service(
        session,
        scope=dealership_id,
        search=search.strip() if search else None,
        skip=skip,
        limit=limit,
    )


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def admin_get_customer(
    customer_id: uuid.UUID, session: SessionDep, _admin: CustomersRead
) -> CustomerResponse:
    """Return any customer."""
    return await get_customer_service(session, scope=None, customer_id=customer_id)


@router.patch("/customers/{customer_id}", response_model=CustomerResponse)
async def admin_update_customer(
    request: Request,
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    session: SessionDep,
    admin: CustomersWrite,
) -> CustomerResponse:
    """Edit any customer."""
    return await update_customer_service(
        session,
        actor=admin,
        scope=None,
        customer_id=customer_id,
        payload=payload,
        request=request,
    )


@router.delete("/customers/{customer_id}", response_model=Message)
async def admin_delete_customer(
    request: Request,
    customer_id: uuid.UUID,
    session: SessionDep,
    admin: CustomersDelete,
) -> Message:
    """Delete any customer that has no quote."""
    return await delete_customer_service(
        session, actor=admin, scope=None, customer_id=customer_id, request=request
    )
