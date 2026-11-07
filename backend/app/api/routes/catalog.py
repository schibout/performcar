"""Catalog read by dealers: vehicles, colors and active services."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import SessionDep, require_user_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.quote import ServiceListResponse, VehicleCatalogResponse
from app.services.catalog_service import (
    get_vehicle_catalog_service,
    list_services_service,
)

router = APIRouter()

CatalogReader = Annotated[
    User, Depends(require_user_permission(Permission.SELF_CATALOG_READ))
]


@router.get("/vehicles", response_model=VehicleCatalogResponse)
async def read_vehicle_catalog(
    session: SessionDep, _current_user: CatalogReader
) -> VehicleCatalogResponse:
    """Return the brands, models, versions and colors."""
    return await get_vehicle_catalog_service(session)


@router.get("/services", response_model=ServiceListResponse)
async def read_active_services(
    session: SessionDep, _current_user: CatalogReader
) -> ServiceListResponse:
    """Return the active services and their categories."""
    return await list_services_service(session, include_inactive=False)
