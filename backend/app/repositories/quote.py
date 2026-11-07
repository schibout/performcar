"""Database access of the quote generator: dealerships, catalog, customers, quotes.

Every query that a dealer reaches takes a ``dealership_id`` scope: ``None`` means
every dealership (admin panel), any other value restricts the rows to it.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dealership import Dealership
from app.models.quote import Customer, Quote, QuoteService
from app.models.user import User
from app.models.vehicle_catalog import (
    CarBrand,
    CarColor,
    CarModel,
    Service,
    ServiceCategory,
)
from app.utils.db_search import LIKE_ESCAPE_CHAR, ilike_contains

# --- Dealerships ---------------------------------------------------------------


async def get_dealership(
    session: AsyncSession, dealership_id: uuid.UUID
) -> Dealership | None:
    """Return a dealership by id."""
    return await session.get(Dealership, dealership_id)


async def list_dealerships_with_counts(
    session: AsyncSession,
) -> list[tuple[Dealership, int, int]]:
    """Return every dealership with its user and quote counts, by name."""
    users = (
        select(func.count(User.id))
        .where(User.dealership_id == Dealership.id)
        .scalar_subquery()
    )
    quotes = (
        select(func.count(Quote.id))
        .where(Quote.dealership_id == Dealership.id)
        .scalar_subquery()
    )
    result = await session.execute(
        select(Dealership, users, quotes).order_by(Dealership.name)
    )
    return [(row[0], int(row[1]), int(row[2])) for row in result.all()]


async def count_dealership_quotes(
    session: AsyncSession, dealership_id: uuid.UUID
) -> int:
    """Return how many quotes a dealership owns."""
    result = await session.execute(
        select(func.count(Quote.id)).where(Quote.dealership_id == dealership_id)
    )
    return int(result.scalar_one())


# --- Catalog --------------------------------------------------------------------


async def list_brands(session: AsyncSession) -> list[CarBrand]:
    """Return every brand with its models and versions, by name."""
    result = await session.execute(
        select(CarBrand)
        .options(selectinload(CarBrand.models).selectinload(CarModel.versions))
        .order_by(CarBrand.name)
    )
    return list(result.scalars().all())


async def list_colors(session: AsyncSession) -> list[CarColor]:
    """Return every vehicle color, by name."""
    result = await session.execute(select(CarColor).order_by(CarColor.name))
    return list(result.scalars().all())


async def list_categories(session: AsyncSession) -> list[ServiceCategory]:
    """Return every service category, by name."""
    result = await session.execute(
        select(ServiceCategory).order_by(ServiceCategory.name)
    )
    return list(result.scalars().all())


async def get_category(
    session: AsyncSession, category_id: uuid.UUID
) -> ServiceCategory | None:
    """Return a service category by id."""
    return await session.get(ServiceCategory, category_id)


async def list_services(session: AsyncSession, *, active_only: bool) -> list[Service]:
    """Return the services, by category then name."""
    statement = (
        select(Service)
        .join(ServiceCategory, Service.category_id == ServiceCategory.id)
        .order_by(ServiceCategory.name, Service.name)
    )
    if active_only:
        statement = statement.where(Service.active.is_(True))
    result = await session.execute(statement)
    return list(result.scalars().all())


async def get_service(session: AsyncSession, service_id: uuid.UUID) -> Service | None:
    """Return a service by id."""
    return await session.get(Service, service_id)


async def get_services_by_ids(
    session: AsyncSession, service_ids: list[uuid.UUID]
) -> list[Service]:
    """Return the services whose id is listed."""
    if not service_ids:
        return []
    result = await session.execute(select(Service).where(Service.id.in_(service_ids)))
    return list(result.scalars().all())


async def is_service_used(session: AsyncSession, service_id: uuid.UUID) -> bool:
    """Return whether a quote includes the service."""
    result = await session.execute(
        select(QuoteService.id).where(QuoteService.service_id == service_id).limit(1)
    )
    return result.first() is not None


# --- Customers ------------------------------------------------------------------


def _scoped(
    statement: Select, column: object, dealership_id: uuid.UUID | None
) -> Select:
    """Restrict a statement to a dealership unless the scope is global."""
    if dealership_id is None:
        return statement
    return statement.where(column == dealership_id)


async def get_customer(
    session: AsyncSession, customer_id: uuid.UUID
) -> Customer | None:
    """Return a customer by id."""
    return await session.get(Customer, customer_id)


async def list_customers(
    session: AsyncSession,
    *,
    dealership_id: uuid.UUID | None,
    search: str | None,
    skip: int,
    limit: int,
) -> tuple[list[tuple[Customer, int]], int]:
    """Return a page of customers with their quote counts, and the total."""
    filters = []
    if search:
        pattern = ilike_contains(search)
        filters.append(
            or_(
                Customer.first_name.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                Customer.last_name.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                Customer.email.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                Customer.phone.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
            )
        )
    quote_count = (
        select(func.count(Quote.id))
        .where(Quote.customer_id == Customer.id)
        .scalar_subquery()
    )
    statement = _scoped(
        select(Customer, quote_count).where(*filters),
        Customer.dealership_id,
        dealership_id,
    )
    total_statement = _scoped(
        select(func.count(Customer.id)).where(*filters),
        Customer.dealership_id,
        dealership_id,
    )
    total = int((await session.execute(total_statement)).scalar_one())
    result = await session.execute(
        statement.order_by(Customer.last_name, Customer.first_name, Customer.id)
        .offset(skip)
        .limit(limit)
    )
    return [(row[0], int(row[1])) for row in result.all()], total


async def count_customer_quotes(session: AsyncSession, customer_id: uuid.UUID) -> int:
    """Return how many quotes a customer has."""
    result = await session.execute(
        select(func.count(Quote.id)).where(Quote.customer_id == customer_id)
    )
    return int(result.scalar_one())


# --- Quotes ------------------------------------------------------------------------


async def get_quote(session: AsyncSession, quote_id: uuid.UUID) -> Quote | None:
    """Return a quote with its relations."""
    result = await session.execute(
        select(Quote)
        .where(Quote.id == quote_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


def _quote_filters(
    *,
    dealership_id: uuid.UUID | None,
    search: str | None,
    status: str | None,
    created_after: datetime | None,
) -> list:
    """Build the WHERE clauses of a quote listing."""
    filters = []
    if dealership_id is not None:
        filters.append(Quote.dealership_id == dealership_id)
    if status:
        filters.append(Quote.status == status)
    if created_after is not None:
        filters.append(Quote.created_at >= created_after)
    if search:
        pattern = ilike_contains(search)
        full_name = Customer.first_name + " " + Customer.last_name
        filters.append(
            or_(
                Quote.reference_number.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                Quote.vehicle_brand.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                Quote.vehicle_model.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                full_name.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
            )
        )
    return filters


async def list_quotes(
    session: AsyncSession,
    *,
    dealership_id: uuid.UUID | None,
    search: str | None,
    status: str | None,
    created_after: datetime | None,
    sort: str,
    descending: bool,
    skip: int,
    limit: int,
) -> tuple[list[Quote], int]:
    """Return a page of quotes and the total matching the filters."""
    filters = _quote_filters(
        dealership_id=dealership_id,
        search=search,
        status=status,
        created_after=created_after,
    )
    base = (
        select(Quote).join(Customer, Quote.customer_id == Customer.id).where(*filters)
    )
    total = int(
        (
            await session.execute(
                select(func.count(Quote.id))
                .join(Customer, Quote.customer_id == Customer.id)
                .where(*filters)
            )
        ).scalar_one()
    )
    if sort == "customer":
        keys = [Customer.last_name, Customer.first_name]
    elif sort == "price":
        keys = [Quote.total_price]
    else:
        keys = [Quote.created_at]
    order = [key.desc() if descending else key.asc() for key in keys]
    result = await session.execute(
        base.order_by(*order, Quote.id).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def count_references_with_prefix(session: AsyncSession, prefix: str) -> int:
    """Return how many reference numbers start with ``prefix``."""
    result = await session.execute(
        select(func.count(Quote.id)).where(Quote.reference_number.like(f"{prefix}%"))
    )
    return int(result.scalar_one())


async def replace_quote_services(
    session: AsyncSession, quote: Quote, lines: list[tuple[uuid.UUID, Decimal]]
) -> None:
    """Replace the service lines of a quote."""
    await session.execute(delete(QuoteService).where(QuoteService.quote_id == quote.id))
    for service_id, price in lines:
        session.add(QuoteService(quote_id=quote.id, service_id=service_id, price=price))


async def quote_status_totals(
    session: AsyncSession, dealership_id: uuid.UUID | None
) -> dict[str, tuple[int, Decimal]]:
    """Return, per status, the number of quotes and their summed total."""
    statement = _scoped(
        select(
            Quote.status, func.count(Quote.id), func.sum(Quote.total_price)
        ).group_by(Quote.status),
        Quote.dealership_id,
        dealership_id,
    )
    result = await session.execute(statement)
    return {row[0]: (int(row[1]), Decimal(str(row[2] or 0))) for row in result.all()}


async def quotes_created_since(
    session: AsyncSession, dealership_id: uuid.UUID | None, since: datetime
) -> list[tuple[datetime, str, Decimal]]:
    """Return the creation date, status and total of the quotes created since a date."""
    statement = _scoped(
        select(Quote.created_at, Quote.status, Quote.total_price).where(
            Quote.created_at >= since
        ),
        Quote.dealership_id,
        dealership_id,
    )
    result = await session.execute(statement)
    return [(row[0], row[1], Decimal(str(row[2]))) for row in result.all()]


async def recent_quotes(
    session: AsyncSession, dealership_id: uuid.UUID | None, limit: int
) -> list[Quote]:
    """Return the latest quotes of a perimeter."""
    statement = _scoped(select(Quote), Quote.dealership_id, dealership_id)
    result = await session.execute(
        statement.order_by(Quote.created_at.desc(), Quote.id).limit(limit)
    )
    return list(result.scalars().all())
