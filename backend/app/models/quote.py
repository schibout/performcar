import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.utils import utc_now

if TYPE_CHECKING:
    from app.models.dealership import Dealership
    from app.models.user import User
    from app.models.vehicle_catalog import Service


class Customer(Base):
    """A customer of a dealership, the recipient of quotes."""

    __tablename__ = "customer"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20), default=None)
    email: Mapped[str | None] = mapped_column(String(100), default=None)
    dealership_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("dealership.id", ondelete="SET NULL"), index=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


QUOTE_STATUSES = ("pending", "confirmed", "completed")
VEHICLE_CONDITIONS = ("new", "used")
FINANCING_TYPES = ("cash", "credit", "leasing_loa", "leasing_lld")


def _in(column: str, values: tuple[str, ...]) -> str:
    """Build the SQL text of a membership check over literal values.

    Written as ``OR``-ed equalities rather than ``IN (...)``: PostgreSQL dumps
    ``IN`` as ``= ANY (ARRAY[...])``, which it does not re-dump identically
    after a reload, whereas equalities round-trip unchanged (and SQLite accepts
    them in tests).
    """
    return "(" + " OR ".join(f"{column} = '{value}'" for value in values) + ")"


class Quote(Base):
    """A vehicle quote of a dealership: vehicle, services, financing, customer."""

    __tablename__ = "quote"
    __table_args__ = (
        CheckConstraint(_in("status", QUOTE_STATUSES), name="ck_quote_status"),
        CheckConstraint(
            _in("vehicle_condition", VEHICLE_CONDITIONS),
            name="ck_quote_vehicle_condition",
        ),
        CheckConstraint(
            "financing_type IS NULL OR " + _in("financing_type", FINANCING_TYPES),
            name="ck_quote_financing_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reference_number: Mapped[str] = mapped_column(String(20), unique=True)
    dealership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dealership.id", ondelete="RESTRICT"), index=True
    )
    # Kept when the author's account is deleted: the quote belongs to the dealership.
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), index=True, default=None
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customer.id", ondelete="RESTRICT"), index=True
    )
    vehicle_brand: Mapped[str] = mapped_column(String(50))
    vehicle_model: Mapped[str] = mapped_column(String(100))
    vehicle_version: Mapped[str | None] = mapped_column(String(100), default=None)
    vehicle_year: Mapped[int] = mapped_column(Integer)
    vehicle_color: Mapped[str] = mapped_column(String(50))
    vehicle_condition: Mapped[str] = mapped_column(String(10))
    financing_type: Mapped[str | None] = mapped_column(String(20), default=None)
    financing_down_payment: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), default=None
    )
    financing_duration_months: Mapped[int | None] = mapped_column(Integer, default=None)
    financing_monthly_payment: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), default=None
    )
    requested_date: Mapped[date | None] = mapped_column(Date, default=None)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    customer: Mapped[Customer] = relationship(lazy="selectin")
    dealership: Mapped["Dealership"] = relationship(lazy="selectin")
    created_by: Mapped["User | None"] = relationship(lazy="selectin")
    services: Mapped[list["QuoteService"]] = relationship(
        back_populates="quote",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )


class QuoteService(Base):
    """A service included in a quote, with its price frozen at selection time."""

    __tablename__ = "quote_service"
    __table_args__ = (UniqueConstraint("quote_id", "service_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quote_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quote.id", ondelete="CASCADE"), index=True
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("service.id", ondelete="RESTRICT"), index=True
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    quote: Mapped[Quote] = relationship(back_populates="services")
    service: Mapped["Service"] = relationship(lazy="selectin")
