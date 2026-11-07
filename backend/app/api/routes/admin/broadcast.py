from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.api.decorators import audit_unexpected_failure
from app.api.deps import SessionDep, require_permission
from app.core.broadcast_templates import list_templates
from app.core.rate_limit import rate_limit_authenticated
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.announcement import (
    AnnouncementListResponse,
    BroadcastCreate,
    BroadcastCreateResponse,
    BroadcastTemplateCatalogResponse,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.services.admin.broadcast_service import (
    create_broadcast_service,
    list_broadcasts_service,
)

router = APIRouter()

AdminBroadcastRead = Annotated[
    User, Depends(require_permission(Permission.BROADCAST_READ))
]
AdminBroadcastWrite = Annotated[
    User, Depends(require_permission(Permission.BROADCAST_WRITE))
]


@router.post(
    "/broadcasts",
    response_model=BroadcastCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
@rate_limit_authenticated("20/minute")
@audit_unexpected_failure(
    activity_type=ActivityType.EXECUTE,
    resource_type=ResourceType.ANNOUNCEMENT,
    endpoint="/admin/broadcasts",
)
async def create_broadcast(
    request: Request,
    admin: AdminBroadcastWrite,
    session: SessionDep,
    payload: BroadcastCreate,
) -> BroadcastCreateResponse:
    """Compose, persist and fan out a broadcast announcement."""
    return await create_broadcast_service(
        session=session, admin=admin, payload=payload, request=request
    )


@router.get("/broadcasts", response_model=AnnouncementListResponse)
@audit_unexpected_failure(
    activity_type=ActivityType.READ,
    resource_type=ResourceType.ANNOUNCEMENT,
    endpoint="/admin/broadcasts",
)
async def list_broadcasts(
    _request: Request,
    _admin: AdminBroadcastRead,
    session: SessionDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AnnouncementListResponse:
    """List sent announcements (admin history)."""
    return await list_broadcasts_service(session=session, skip=skip, limit=limit)


@router.get("/broadcast-templates", response_model=BroadcastTemplateCatalogResponse)
async def get_broadcast_templates(
    _admin: AdminBroadcastWrite,
) -> BroadcastTemplateCatalogResponse:
    """Return the reusable announcement template catalog for the compose form."""
    return BroadcastTemplateCatalogResponse(templates=list_templates())
