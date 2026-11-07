"""Vehicle catalog and priced services offered in quotes."""

import logging
import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.user import User
from app.models.vehicle_catalog import Service
from app.repositories.quote import (
    get_category,
    get_service,
    is_service_used,
    list_brands,
    list_categories,
    list_colors,
    list_services,
)
from app.schemas.msg import Message
from app.schemas.quote import (
    CarBrandResponse,
    CarColorResponse,
    ServiceCategoryResponse,
    ServiceCreate,
    ServiceListResponse,
    ServiceResponse,
    ServiceUpdate,
    VehicleCatalogResponse,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.log_activity import log_activity

logger = logging.getLogger(__name__)


async def get_vehicle_catalog_service(session: AsyncSession) -> VehicleCatalogResponse:
    """Return the brands, models, versions and colors of the vehicle step."""
    brands = await list_brands(session)
    colors = await list_colors(session)
    return VehicleCatalogResponse(
        brands=[CarBrandResponse.model_validate(brand) for brand in brands],
        colors=[CarColorResponse.model_validate(color) for color in colors],
    )


async def list_services_service(
    session: AsyncSession, *, include_inactive: bool
) -> ServiceListResponse:
    """Return the services (active only unless asked) and every category."""
    services = await list_services(session, active_only=not include_inactive)
    categories = await list_categories(session)
    return ServiceListResponse(
        items=[ServiceResponse.model_validate(service) for service in services],
        categories=[ServiceCategoryResponse.model_validate(c) for c in categories],
    )


async def _require_category(session: AsyncSession, category_id: uuid.UUID) -> None:
    """Raise 404 unless the category exists."""
    if await get_category(session, category_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.SERVICE_CATEGORY_NOT_FOUND,
        )


async def _require_service(session: AsyncSession, service_id: uuid.UUID) -> Service:
    """Return the service or raise 404."""
    service = await get_service(session, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.SERVICE_NOT_FOUND,
        )
    return service


async def create_service_service(
    session: AsyncSession, *, actor: User, payload: ServiceCreate, request: Request
) -> ServiceResponse:
    """Add a service to the catalog."""
    await _require_category(session, payload.category_id)
    service = Service(**payload.model_dump())
    session.add(service)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.CREATE,
        ResourceType.SERVICE,
        details={"name": service.name},
        resource_id=service.id,
        request=request,
    )
    await session.refresh(service, ["category"])
    return ServiceResponse.model_validate(service)


async def update_service_service(
    session: AsyncSession,
    *,
    actor: User,
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    request: Request,
) -> ServiceResponse:
    """Edit a service; quotes keep the price they were made with."""
    service = await _require_service(session, service_id)
    changes = payload.model_dump(exclude_unset=True)
    for field in ("name", "price", "category_id", "active"):
        if field in changes and changes[field] is None:
            changes.pop(field)
    if "category_id" in changes:
        await _require_category(session, changes["category_id"])
    for field, value in changes.items():
        setattr(service, field, value)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.UPDATE,
        ResourceType.SERVICE,
        details={"fields": sorted(changes)},
        resource_id=service.id,
        request=request,
    )
    await session.refresh(service, ["category"])
    return ServiceResponse.model_validate(service)


async def delete_service_service(
    session: AsyncSession, *, actor: User, service_id: uuid.UUID, request: Request
) -> Message:
    """Delete a service that no quote includes; deactivate it otherwise."""
    service = await _require_service(session, service_id)
    if await is_service_used(session, service_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorMessages.SERVICE_IN_USE,
        )
    name = service.name
    await session.delete(service)
    await session.flush()
    await log_activity(
        session,
        actor.id,
        ActivityType.DELETE,
        ResourceType.SERVICE,
        details={"name": name},
        resource_id=service_id,
        request=request,
    )
    return Message(success=True, message=SuccessMessages.SERVICE_DELETED)
