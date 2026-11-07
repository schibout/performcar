import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.utils import utc_now


class _Timestamps:
    """Creation and update timestamps shared by the catalog tables."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class CarBrand(_Timestamps, Base):
    """A vehicle brand of the quote catalog."""

    __tablename__ = "car_brand"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    models: Mapped[list["CarModel"]] = relationship(
        back_populates="brand",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CarModel.name",
    )


class CarModel(_Timestamps, Base):
    """A model of a brand."""

    __tablename__ = "car_model"
    __table_args__ = (UniqueConstraint("brand_id", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("car_brand.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))

    brand: Mapped[CarBrand] = relationship(back_populates="models")
    versions: Mapped[list["CarVersion"]] = relationship(
        back_populates="model",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CarVersion.name",
    )


class CarVersion(_Timestamps, Base):
    """A version (trim) of a model."""

    __tablename__ = "car_version"
    __table_args__ = (UniqueConstraint("model_id", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    model_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("car_model.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))

    model: Mapped[CarModel] = relationship(back_populates="versions")


class CarColor(_Timestamps, Base):
    """A color offered in the vehicle step of a quote."""

    __tablename__ = "car_color"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class ServiceCategory(_Timestamps, Base):
    """A category grouping the services sold with a quote."""

    __tablename__ = "service_category"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)


class Service(_Timestamps, Base):
    """A priced service that a quote can include."""

    __tablename__ = "service"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("service_category.id", ondelete="RESTRICT"), index=True
    )
    description: Mapped[str | None] = mapped_column(Text, default=None)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped[ServiceCategory] = relationship(lazy="selectin")
