"""Quotes: vehicle, services, financing and customer of a dealership's offer.

Business rules of the original quote generator, enforced server side:

* prices come from the catalog, frozen on the quote line when first selected;
* the total is the sum of the selected service lines;
* the monthly payment of a financed quote is ``(total - down payment) / months``
  and the down payment cannot exceed the total; a cash quote has no terms;
* a new quote is ``pending``; its reference is ``QUO-YYYYMMDD-NNNN``.

``scope`` is the dealership perimeter (``None`` for the admin panel); a quote
outside it answers 404 like a missing one.
"""

import logging
import uuid
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.quote import Customer, Quote
from app.models.user import User
from app.repositories.quote import (
    count_references_with_prefix,
    get_customer,
    get_dealership,
    get_quote,
    get_services_by_ids,
    list_quotes,
    quote_status_totals,
    quotes_created_since,
    recent_quotes,
    replace_quote_services,
)
from app.schemas.msg import Message
from app.schemas.quote import (
    CustomerResponse,
    DealershipResponse,
    FinancingData,
    FinancingType,
    MonthlyQuoteStat,
    QuoteAuthor,
    QuoteCreate,
    QuoteCustomerData,
    QuoteFinancing,
    QuoteListResponse,
    QuoteResponse,
    QuoteServiceLine,
    QuoteSort,
    QuoteStatsResponse,
    QuoteStatus,
    QuoteUpdate,
    QuoteVehicle,
    SortOrder,
    VehicleData,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.dealership_scope import ensure_in_scope
from app.use_cases.log_activity import log_activity
from app.utils import ensure_utc, utc_now

logger = logging.getLogger(__name__)

_CENT = Decimal("0.01")
_RECENT_COUNT = 3
_MONTHS_IN_CHART = 6
_PERIODS = {"today", "week", "month"}


# --- Mapping ---------------------------------------------------------------------


def to_quote_response(quote: Quote) -> QuoteResponse:
    """Map a loaded quote to its API schema."""
    financing = None
    if quote.financing_type is not None:
        financing = QuoteFinancing(
            type=FinancingType(quote.financing_type),
            down_payment=quote.financing_down_payment,
            duration_months=quote.financing_duration_months,
            monthly_payment=quote.financing_monthly_payment,
        )
    lines = sorted(
        quote.services,
        key=lambda line: (line.service.category.name, line.service.name),
    )
    return QuoteResponse(
        id=quote.id,
        reference_number=quote.reference_number,
        status=QuoteStatus(quote.status),
        total_price=quote.total_price,
        requested_date=quote.requested_date,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
        dealership=DealershipResponse.model_validate(quote.dealership),
        created_by=(
            QuoteAuthor.model_validate(quote.created_by) if quote.created_by else None
        ),
        customer=CustomerResponse.model_validate(quote.customer),
        vehicle=QuoteVehicle(
            brand=quote.vehicle_brand,
            model=quote.vehicle_model,
            version=quote.vehicle_version,
            year=quote.vehicle_year,
            color=quote.vehicle_color,
            condition=quote.vehicle_condition,
        ),
        financing=financing,
        services=[
            QuoteServiceLine(
                service_id=line.service_id,
                name=line.service.name,
                description=line.service.description,
                category_name=line.service.category.name,
                category_code=line.service.category.code,
                price=line.price,
            )
            for line in lines
        ],
    )


# --- Rules ------------------------------------------------------------------------


def _bad_request(detail: str) -> HTTPException:
    """Build the 422 raised when a business rule refuses the payload."""
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail
    )


async def _require_quote(
    session: AsyncSession, quote_id: uuid.UUID, scope: uuid.UUID | None
) -> Quote:
    """Return the quote when it exists inside the scope, else raise 404."""
    quote = await get_quote(session, quote_id)
    if quote is None or not ensure_in_scope(quote.dealership_id, scope):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.QUOTE_NOT_FOUND,
        )
    return quote


async def _resolve_lines(
    session: AsyncSession,
    service_ids: list[uuid.UUID],
    frozen: dict[uuid.UUID, Decimal],
) -> list[tuple[uuid.UUID, Decimal]]:
    """Price the selected services: kept lines keep their price, new ones use the catalog.

    A service newly added to a quote must exist and be active.
    """
    wanted = list(dict.fromkeys(service_ids))
    services = {
        service.id: service for service in await get_services_by_ids(session, wanted)
    }
    lines: list[tuple[uuid.UUID, Decimal]] = []
    for service_id in wanted:
        if service_id in frozen:
            lines.append((service_id, frozen[service_id]))
            continue
        service = services.get(service_id)
        if service is None or not service.active:
            raise _bad_request(ErrorMessages.SERVICE_UNAVAILABLE)
        lines.append((service_id, Decimal(service.price)))
    return lines


def _apply_financing(
    quote: Quote, financing: FinancingData | None, total: Decimal
) -> None:
    """Store the financing terms and compute the monthly payment."""
    if financing is None or financing.type is FinancingType.CASH:
        quote.financing_type = financing.type.value if financing else None
        quote.financing_down_payment = None
        quote.financing_duration_months = None
        quote.financing_monthly_payment = None
        return
    if financing.duration_months is None:
        raise _bad_request(ErrorMessages.QUOTE_FINANCING_INCOMPLETE)
    down_payment = Decimal(financing.down_payment).quantize(_CENT)
    if down_payment > total:
        raise _bad_request(ErrorMessages.QUOTE_DOWN_PAYMENT_TOO_HIGH)
    monthly = ((total - down_payment) / financing.duration_months).quantize(
        _CENT, rounding=ROUND_HALF_UP
    )
    quote.financing_type = financing.type.value
    quote.financing_down_payment = down_payment
    quote.financing_duration_months = financing.duration_months
    quote.financing_monthly_payment = monthly


def _current_financing(quote: Quote) -> FinancingData | None:
    """Return the quote's stored financing request."""
    if quote.financing_type is None:
        return None
    return FinancingData(
        type=FinancingType(quote.financing_type),
        down_payment=quote.financing_down_payment or Decimal("0"),
        duration_months=quote.financing_duration_months,
    )


def _apply_vehicle(quote: Quote, vehicle: VehicleData) -> None:
    """Copy the vehicle onto the quote."""
    quote.vehicle_brand = vehicle.brand
    quote.vehicle_model = vehicle.model
    quote.vehicle_version = vehicle.version
    quote.vehicle_year = vehicle.year
    quote.vehicle_color = vehicle.color
    quote.vehicle_condition = vehicle.condition.value


async def _resolve_customer(
    session: AsyncSession, data: QuoteCustomerData, dealership_id: uuid.UUID
) -> Customer:
    """Update the given customer of the dealership, or create a new one."""
    fields = data.model_dump(exclude={"id"})
    if data.id is not None:
        customer = await get_customer(session, data.id)
        if customer is None or customer.dealership_id != dealership_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorMessages.CUSTOMER_NOT_FOUND,
            )
        for field, value in fields.items():
            setattr(customer, field, value)
        return customer
    customer = Customer(**fields, dealership_id=dealership_id)
    session.add(customer)
    await session.flush()
    return customer


async def _next_reference(session: AsyncSession) -> str:
    """Return the next ``QUO-YYYYMMDD-NNNN`` reference of the day."""
    prefix = f"QUO-{utc_now():%Y%m%d}-"
    sequence = await count_references_with_prefix(session, prefix) + 1
    return f"{prefix}{sequence:04d}"


# --- Queries ----------------------------------------------------------------------


def _period_start(period: str | None) -> datetime | None:
    """Return the creation lower bound of a history period filter."""
    if period not in _PERIODS:
        return None
    now = utc_now()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":
        return now - timedelta(days=7)
    return now - timedelta(days=30)


async def list_quotes_service(
    session: AsyncSession,
    *,
    scope: uuid.UUID | None,
    search: str | None,
    status_filter: QuoteStatus | None,
    period: str | None,
    sort: QuoteSort,
    order: SortOrder,
    skip: int,
    limit: int,
) -> QuoteListResponse:
    """Return a filtered, sorted page of the scope's quotes."""
    quotes, total = await list_quotes(
        session,
        dealership_id=scope,
        search=search.strip() if search else None,
        status=status_filter.value if status_filter else None,
        created_after=_period_start(period),
        sort=sort.value,
        descending=order is SortOrder.DESC,
        skip=skip,
        limit=limit,
    )
    return QuoteListResponse(items=[to_quote_response(q) for q in quotes], total=total)


async def get_quote_service(
    session: AsyncSession, *, scope: uuid.UUID | None, quote_id: uuid.UUID
) -> QuoteResponse:
    """Return one quote of the scope."""
    return to_quote_response(await _require_quote(session, quote_id, scope))


def _month_start(moment: datetime, months_back: int) -> datetime:
    """Return the first instant of the month ``months_back`` before ``moment``."""
    index = moment.year * 12 + moment.month - 1 - months_back
    return moment.replace(
        year=index // 12,
        month=index % 12 + 1,
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


async def quote_stats_service(
    session: AsyncSession, *, scope: uuid.UUID | None
) -> QuoteStatsResponse:
    """Return the dashboard figures of the scope's quotes."""
    totals = await quote_status_totals(session, scope)
    count = {key: totals.get(key.value, (0, Decimal("0"))) for key in QuoteStatus}
    total = sum(value[0] for value in totals.values())
    amount = sum((value[1] for value in totals.values()), Decimal("0"))
    completed = count[QuoteStatus.COMPLETED]

    now = utc_now()
    window_start = _month_start(now, _MONTHS_IN_CHART - 1)
    buckets: dict[tuple[int, int], list] = {}
    for months_back in range(_MONTHS_IN_CHART - 1, -1, -1):
        start = _month_start(now, months_back)
        buckets[(start.year, start.month)] = [0, Decimal("0")]
    for created_at, quote_status, price in await quotes_created_since(
        session, scope, window_start
    ):
        created = ensure_utc(created_at)
        bucket = buckets.get((created.year, created.month))
        if bucket is None:
            continue
        bucket[0] += 1
        if quote_status == QuoteStatus.COMPLETED.value:
            bucket[1] += price
    monthly = [
        MonthlyQuoteStat(year=year, month=month, quotes=values[0], revenue=values[1])
        for (year, month), values in buckets.items()
    ]
    return QuoteStatsResponse(
        total=total,
        pending=count[QuoteStatus.PENDING][0],
        confirmed=count[QuoteStatus.CONFIRMED][0],
        completed=completed[0],
        revenue=completed[1],
        average_value=(amount / total).quantize(_CENT) if total else Decimal("0"),
        conversion_rate=round(completed[0] / total * 100, 1) if total else 0.0,
        current_month=monthly[-1].quotes,
        previous_month=monthly[-2].quotes,
        monthly=monthly,
        recent=[
            to_quote_response(q)
            for q in await recent_quotes(session, scope, _RECENT_COUNT)
        ],
    )


# --- Commands ---------------------------------------------------------------------


async def create_quote_service(
    session: AsyncSession,
    *,
    actor: User,
    dealership_id: uuid.UUID,
    payload: QuoteCreate,
    request: Request,
) -> QuoteResponse:
    """Create a pending quote for the dealership, with its customer and services."""
    if await get_dealership(session, dealership_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.DEALERSHIP_NOT_FOUND,
        )
    customer = await _resolve_customer(session, payload.customer, dealership_id)
    lines = await _resolve_lines(session, payload.service_ids, {})
    total = sum((price for _, price in lines), Decimal("0"))

    quote = Quote(
        reference_number=await _next_reference(session),
        dealership_id=dealership_id,
        created_by_id=actor.id,
        customer_id=customer.id,
        requested_date=payload.requested_date,
        status=QuoteStatus.PENDING.value,
        total_price=total,
    )
    _apply_vehicle(quote, payload.vehicle)
    _apply_financing(quote, payload.financing, total)
    session.add(quote)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        logger.warning("Quote reference collision: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorMessages.QUOTE_REFERENCE_CONFLICT,
        ) from exc
    await replace_quote_services(session, quote, lines)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.CREATE,
        ResourceType.QUOTE,
        details={"reference": quote.reference_number},
        resource_id=quote.id,
        request=request,
    )
    return to_quote_response(await _require_quote(session, quote.id, None))


async def update_quote_service(
    session: AsyncSession,
    *,
    actor: User,
    scope: uuid.UUID | None,
    quote_id: uuid.UUID,
    payload: QuoteUpdate,
    request: Request,
) -> QuoteResponse:
    """Edit a quote of the scope; totals and terms are recomputed."""
    quote = await _require_quote(session, quote_id, scope)
    fields = sorted(payload.model_fields_set)

    if payload.vehicle is not None:
        _apply_vehicle(quote, payload.vehicle)
    if payload.customer is not None:
        customer = await _resolve_customer(
            session, payload.customer, quote.dealership_id
        )
        quote.customer_id = customer.id
    if "requested_date" in payload.model_fields_set:
        quote.requested_date = payload.requested_date
    if payload.status is not None:
        quote.status = payload.status.value

    total = quote.total_price
    if payload.service_ids is not None:
        frozen = {line.service_id: line.price for line in quote.services}
        lines = await _resolve_lines(session, payload.service_ids, frozen)
        total = sum((price for _, price in lines), Decimal("0"))
        await replace_quote_services(session, quote, lines)
        quote.total_price = total
    financing = (
        payload.financing
        if "financing" in payload.model_fields_set
        else _current_financing(quote)
    )
    _apply_financing(quote, financing, Decimal(total))
    quote.updated_at = utc_now()

    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.UPDATE,
        ResourceType.QUOTE,
        details={"reference": quote.reference_number, "fields": fields},
        resource_id=quote.id,
        request=request,
    )
    return to_quote_response(await _require_quote(session, quote.id, None))


async def delete_quote_service(
    session: AsyncSession,
    *,
    actor: User,
    scope: uuid.UUID | None,
    quote_id: uuid.UUID,
    request: Request,
) -> Message:
    """Delete a quote of the scope and its service lines; the customer is kept."""
    quote = await _require_quote(session, quote_id, scope)
    reference = quote.reference_number
    await session.delete(quote)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.DELETE,
        ResourceType.QUOTE,
        details={"reference": reference},
        resource_id=quote_id,
        request=request,
    )
    return Message(success=True, message=SuccessMessages.QUOTE_DELETED)
