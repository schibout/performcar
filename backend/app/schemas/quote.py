"""API-boundary DTOs of the quote generator: dealerships, catalog, customers, quotes.

The validation rules are those of the original quote generator (lengths, French
phone numbers, letters-only names, model years, financing bounds).
"""

import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    EmailStr,
    Field,
    PlainSerializer,
    StringConstraints,
)

from app.utils import utc_now

# Decimal amounts travel as JSON numbers, not strings.
Money = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]

_NAME_PATTERN = re.compile(r"^[a-zA-ZÀ-ÿ\-\s']+$")
_PHONE_PATTERN = re.compile(r"^(?:\+33|0)[1-9][0-9]{8}$")


def _empty_to_none(value: object) -> object:
    """Treat an empty or blank string as an absent optional value."""
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _normalize_phone(value: str | None) -> str | None:
    """Strip separators and require a French phone number."""
    if value is None:
        return None
    compact = re.sub(r"[\s.\-()]", "", value)
    if not _PHONE_PATTERN.match(compact):
        raise ValueError("invalid French phone number")
    return compact


def _check_person_name(value: str) -> str:
    """Allow letters, spaces, hyphens and apostrophes only."""
    if not _NAME_PATTERN.match(value):
        raise ValueError("letters, spaces, hyphens and apostrophes only")
    return value


PersonName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=2, max_length=100),
    AfterValidator(_check_person_name),
]
OptionalPhone = Annotated[
    str | None, BeforeValidator(_empty_to_none), AfterValidator(_normalize_phone)
]
OptionalEmail = Annotated[
    EmailStr | None, BeforeValidator(_empty_to_none), Field(max_length=100)
]


class QuoteStatus(StrEnum):
    """Lifecycle of a quote."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"


class VehicleCondition(StrEnum):
    """Whether the quoted vehicle is new or used."""

    NEW = "new"
    USED = "used"


class FinancingType(StrEnum):
    """How the customer pays."""

    CASH = "cash"
    CREDIT = "credit"
    LEASING_LOA = "leasing_loa"
    LEASING_LLD = "leasing_lld"


class QuoteSort(StrEnum):
    """Sort keys of the quote history."""

    DATE = "date"
    CUSTOMER = "customer"
    PRICE = "price"


class SortOrder(StrEnum):
    """Sort direction."""

    ASC = "asc"
    DESC = "desc"


# --- Dealerships -------------------------------------------------------------


class DealershipBase(BaseModel):
    """Editable fields of a dealership."""

    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
    ]
    logo_url: Annotated[
        str | None, BeforeValidator(_empty_to_none), Field(max_length=255)
    ] = None
    address: Annotated[
        str | None, BeforeValidator(_empty_to_none), Field(max_length=500)
    ] = None
    phone: OptionalPhone = None
    email: OptionalEmail = None


class DealershipCreate(DealershipBase):
    """Create a dealership."""


class DealershipUpdate(BaseModel):
    """Partial update of a dealership."""

    name: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
        ]
        | None
    ) = None
    logo_url: Annotated[
        str | None, BeforeValidator(_empty_to_none), Field(max_length=255)
    ] = None
    address: Annotated[
        str | None, BeforeValidator(_empty_to_none), Field(max_length=500)
    ] = None
    phone: OptionalPhone = None
    email: OptionalEmail = None


class DealershipResponse(BaseModel):
    """A dealership."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    logo_url: str | None
    address: str | None
    phone: str | None
    email: str | None
    created_at: datetime
    updated_at: datetime


class DealershipListItem(DealershipResponse):
    """A dealership with the size of its perimeter."""

    user_count: int = 0
    quote_count: int = 0


class DealershipListResponse(BaseModel):
    """Every dealership."""

    items: list[DealershipListItem]
    total: int


# --- Catalog -----------------------------------------------------------------


class CarVersionResponse(BaseModel):
    """A model version."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class CarModelResponse(BaseModel):
    """A brand model and its versions."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    versions: list[CarVersionResponse]


class CarBrandResponse(BaseModel):
    """A brand and its models."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    models: list[CarModelResponse]


class CarColorResponse(BaseModel):
    """A vehicle color."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class VehicleCatalogResponse(BaseModel):
    """Everything the vehicle step of a quote offers."""

    brands: list[CarBrandResponse]
    colors: list[CarColorResponse]


class ServiceCategoryResponse(BaseModel):
    """A service category."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str


class ServiceResponse(BaseModel):
    """A priced service of the catalog."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    price: Money
    description: str | None
    active: bool
    category: ServiceCategoryResponse


class ServiceListResponse(BaseModel):
    """Services with the categories they belong to."""

    items: list[ServiceResponse]
    categories: list[ServiceCategoryResponse]


_ServiceName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
]
_Price = Annotated[Decimal, Field(ge=0, le=Decimal("99999.99"), decimal_places=2)]
_Description = Annotated[
    str | None, BeforeValidator(_empty_to_none), Field(max_length=1000)
]


class ServiceCreate(BaseModel):
    """Create a service."""

    name: _ServiceName
    price: _Price
    category_id: uuid.UUID
    description: _Description = None
    active: bool = True


class ServiceUpdate(BaseModel):
    """Partial update of a service."""

    name: _ServiceName | None = None
    price: _Price | None = None
    category_id: uuid.UUID | None = None
    description: _Description = None
    active: bool | None = None


# --- Customers -----------------------------------------------------------------


class CustomerFields(BaseModel):
    """Identity and contact of a customer."""

    first_name: PersonName
    last_name: PersonName
    phone: OptionalPhone = None
    email: OptionalEmail = None


class CustomerCreate(CustomerFields):
    """Create a customer in the caller's dealership."""


class CustomerUpdate(BaseModel):
    """Partial update of a customer."""

    first_name: PersonName | None = None
    last_name: PersonName | None = None
    phone: OptionalPhone = None
    email: OptionalEmail = None


class CustomerResponse(BaseModel):
    """A customer."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    phone: str | None
    email: str | None
    dealership_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class CustomerListItem(CustomerResponse):
    """A customer with its number of quotes."""

    quote_count: int = 0


class CustomerListResponse(BaseModel):
    """A page of customers."""

    items: list[CustomerListItem]
    total: int


# --- Quotes ----------------------------------------------------------------------


def _check_year(value: int) -> int:
    """Accept model years from 2000 to next year."""
    if not 2000 <= value <= utc_now().year + 1:
        raise ValueError("year out of range")
    return value


class VehicleData(BaseModel):
    """The quoted vehicle."""

    brand: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=2, max_length=50)
    ]
    model: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
    ]
    version: Annotated[
        str | None,
        BeforeValidator(_empty_to_none),
        StringConstraints(strip_whitespace=True, max_length=100),
    ] = None
    year: Annotated[int, AfterValidator(_check_year)]
    color: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=2, max_length=50)
    ]
    condition: VehicleCondition


class FinancingData(BaseModel):
    """Requested financing; the monthly payment is computed by the server."""

    type: FinancingType
    down_payment: Annotated[
        Decimal, Field(ge=0, le=Decimal("999999.99"), decimal_places=2)
    ] = Decimal("0")
    duration_months: Annotated[int, Field(ge=1, le=120)] | None = None


class QuoteCustomerData(CustomerFields):
    """The quote's customer: an existing one (``id``) or a new one."""

    id: uuid.UUID | None = None


def _not_in_past(value: date | None) -> date | None:
    """Refuse a requested date before today."""
    if value is not None and value < utc_now().date():
        raise ValueError("date in the past")
    return value


RequestedDate = Annotated[date | None, AfterValidator(_not_in_past)]
ServiceIds = Annotated[list[uuid.UUID], Field(max_length=100)]


class QuoteCreate(BaseModel):
    """Create a quote; prices and totals are computed from the catalog."""

    vehicle: VehicleData
    customer: QuoteCustomerData
    service_ids: ServiceIds = Field(default_factory=list)
    financing: FinancingData | None = None
    requested_date: RequestedDate = None


class QuoteUpdate(BaseModel):
    """Partial update of a quote; only the given parts change."""

    vehicle: VehicleData | None = None
    customer: QuoteCustomerData | None = None
    service_ids: ServiceIds | None = None
    financing: FinancingData | None = None
    requested_date: RequestedDate = None
    status: QuoteStatus | None = None


class QuoteVehicle(BaseModel):
    """The quoted vehicle."""

    brand: str
    model: str
    version: str | None
    year: int
    color: str
    condition: VehicleCondition


class QuoteFinancing(BaseModel):
    """The quote's financing."""

    type: FinancingType
    down_payment: Money | None
    duration_months: int | None
    monthly_payment: Money | None


class QuoteServiceLine(BaseModel):
    """A service line of a quote, at its frozen price."""

    service_id: uuid.UUID
    name: str
    description: str | None
    category_name: str
    category_code: str
    price: Money


class QuoteAuthor(BaseModel):
    """Who created the quote."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str | None
    last_name: str | None


class QuoteResponse(BaseModel):
    """A complete quote."""

    id: uuid.UUID
    reference_number: str
    status: QuoteStatus
    total_price: Money
    requested_date: date | None
    created_at: datetime
    updated_at: datetime
    dealership: DealershipResponse
    created_by: QuoteAuthor | None
    customer: CustomerResponse
    vehicle: QuoteVehicle
    financing: QuoteFinancing | None
    services: list[QuoteServiceLine]


class QuoteListResponse(BaseModel):
    """A page of quotes."""

    items: list[QuoteResponse]
    total: int


class MonthlyQuoteStat(BaseModel):
    """Quotes created in one month."""

    year: int
    month: int
    quotes: int
    revenue: Money


class QuoteStatsResponse(BaseModel):
    """Dashboard figures of a perimeter of quotes."""

    total: int
    pending: int
    confirmed: int
    completed: int
    revenue: Money
    average_value: Money
    conversion_rate: float
    current_month: int
    previous_month: int
    monthly: list[MonthlyQuoteStat]
    recent: list[QuoteResponse]
