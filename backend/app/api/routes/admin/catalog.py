"""Admin catalog: the services offered in quotes, and the vehicle catalog."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import SessionDep, require_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.quote import (
    ServiceCreate,
    ServiceListResponse,
    ServiceResponse,
    ServiceUpdate,
    VehicleCatalogResponse,
)
from app.services.catalog_service import (
    create_service_service,
    delete_service_service,
    get_vehicle_catalog_service,
    list_services_service,
    update_service_service,
)

router = APIRouter()

CatalogRead = Annotated[User, Depends(require_permission(Permission.CATALOG_READ))]
CatalogWrite = Annotated[User, Depends(require_permission(Permission.CATALOG_WRITE))]


@router.get("/catalog/vehicles", response_model=VehicleCatalogResponse)
async def admin_vehicle_catalog(
    session: SessionDep, _admin: CatalogRead
) -> VehicleCatalogResponse:
    """Return the brands, models, versions and colors."""
    return await get_vehicle_catalog_service(session)


@router.get("/catalog/services", response_model=ServiceListResponse)
async def admin_list_services(
    session: SessionDep, _admin: CatalogRead
) -> ServiceListResponse:
    """Return every service, inactive ones included."""
    return await list_services_service(session, include_inactive=True)


@router.post(
    "/catalog/services",
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_service(
    request: Request, payload: ServiceCreate, session: SessionDep, admin: CatalogWrite
) -> ServiceResponse:
    """Add a service."""
    return await create_service_service(
        session, actor=admin, payload=payload, request=request
    )


@router.patch("/catalog/services/{service_id}", response_model=ServiceResponse)
async def admin_update_service(
    request: Request,
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    session: SessionDep,
    admin: CatalogWrite,
) -> ServiceResponse:
    """Edit a service."""
    return await update_service_service(
        session, actor=admin, service_id=service_id, payload=payload, request=request
    )


@router.delete("/catalog/services/{service_id}", response_model=Message)
async def admin_delete_service(
    request: Request, service_id: uuid.UUID, session: SessionDep, admin: CatalogWrite
) -> Message:
    """Delete a service that no quote includes."""
    return await delete_service_service(
        session, actor=admin, service_id=service_id, request=request
    )
