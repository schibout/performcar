"""Fixtures of the quote generator tests: dealerships, catalog and accounts."""

import uuid
from dataclasses import dataclass
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update

from app.models.dealership import Dealership
from app.models.rbac import RbacRole, RbacUserRole
from app.models.user import User
from app.models.vehicle_catalog import (
    CarBrand,
    CarColor,
    CarModel,
    CarVersion,
    Service,
    ServiceCategory,
)
from app.tests.admin.conftest import login, promote_to_admin, register_and_verify
from app.tests.conftest import TestingSessionLocal
from app.tests.support.conftest import ClientFactory, client_factory  # noqa: F401
from app.use_cases.permissions import invalidate_user_permissions


@dataclass
class Catalog:
    """Ids of the catalog rows created for a test."""

    category_id: uuid.UUID
    warranty_id: uuid.UUID
    delivery_id: uuid.UUID
    inactive_id: uuid.UUID


async def make_dealership(name: str) -> uuid.UUID:
    """Insert a dealership and return its id."""
    async with TestingSessionLocal() as session:
        dealership = Dealership(name=name, phone="0142567890", email="d@test.com")
        session.add(dealership)
        await session.commit()
        return dealership.id


async def assign_role(email: str, role_key: str) -> uuid.UUID:
    """Give an account a system role and return the account id."""
    async with TestingSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one()
        role = (
            await session.execute(select(RbacRole).where(RbacRole.key == role_key))
        ).scalar_one()
        session.add(RbacUserRole(user_id=user.id, role_id=role.id))
        await session.commit()
        user_id = user.id
    await invalidate_user_permissions(user_id)
    return user_id


async def attach_dealership(email: str, dealership_id: uuid.UUID | None) -> None:
    """Attach an account to a dealership."""
    async with TestingSessionLocal() as session:
        await session.execute(
            update(User).where(User.email == email).values(dealership_id=dealership_id)
        )
        await session.commit()


async def make_dealer(
    factory: ClientFactory, email: str, dealership_id: uuid.UUID | None
) -> AsyncClient:
    """Build a logged-in dealer of the given dealership."""
    client = await factory()
    await register_and_verify(client, email)
    await assign_role(email, "dealer")
    await attach_dealership(email, dealership_id)
    await login(client, email)
    return client


async def make_network_admin(factory: ClientFactory, email: str) -> AsyncClient:
    """Build a logged-in admin holding the dealer network administrator role."""
    client = await factory()
    await register_and_verify(client, email)
    await promote_to_admin(email)
    await assign_role(email, "dealer_network_admin")
    await login(client, email)
    return client


@pytest_asyncio.fixture
async def catalog() -> Catalog:
    """Insert a small vehicle and service catalog."""
    async with TestingSessionLocal() as session:
        category = ServiceCategory(name="Garantie", code="GAR")
        session.add(category)
        await session.flush()
        warranty = Service(
            name="Garantie étendue 3 ans",
            price=Decimal("1200.00"),
            category_id=category.id,
        )
        delivery = Service(
            name="Livraison à domicile",
            price=Decimal("250.00"),
            category_id=category.id,
        )
        inactive = Service(
            name="Ancien service",
            price=Decimal("99.00"),
            category_id=category.id,
            active=False,
        )
        brand = CarBrand(name="Audi")
        session.add_all([warranty, delivery, inactive, brand, CarColor(name="Blanc")])
        await session.flush()
        model = CarModel(brand_id=brand.id, name="A3")
        session.add(model)
        await session.flush()
        session.add(CarVersion(model_id=model.id, name="Sportback 1.5 TFSI"))
        await session.commit()
        return Catalog(category.id, warranty.id, delivery.id, inactive.id)


def quote_payload(catalog: Catalog, **overrides: object) -> dict[str, object]:
    """Build a valid quote creation payload."""
    payload: dict[str, object] = {
        "vehicle": {
            "brand": "Audi",
            "model": "A3",
            "version": "Sportback 1.5 TFSI",
            "year": 2024,
            "color": "Blanc",
            "condition": "new",
        },
        "customer": {
            "first_name": "Jean",
            "last_name": "Dupont",
            "phone": "06 12 34 56 78",
            "email": "jean.dupont@test.com",
        },
        "service_ids": [str(catalog.warranty_id), str(catalog.delivery_id)],
        "financing": {"type": "credit", "down_payment": 250, "duration_months": 12},
    }
    payload.update(overrides)
    return payload
