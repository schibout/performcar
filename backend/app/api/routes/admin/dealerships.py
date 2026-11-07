"""Admin dealerships."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import SessionDep, require_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.quote import (
    DealershipCreate,
    DealershipListResponse,
    DealershipResponse,
    DealershipUpdate,
)
from app.services.dealership_service import (
    create_dealership_service,
    delete_dealership_service,
    get_dealership_service,
    list_dealerships_service,
    update_dealership_service,
)

router = APIRouter()

DealershipsRead = Annotated[
    User, Depends(require_permission(Permission.DEALERSHIPS_READ))
]
DealershipsWrite = Annotated[
    User, Depends(require_permission(Permission.DEALERSHIPS_WRITE))
]
DealershipsDelete = Annotated[
    User, Depends(require_permission(Permission.DEALERSHIPS_DELETE))
]


@router.get("/dealerships", response_model=DealershipListResponse)
async def admin_list_dealerships(
    session: SessionDep, _admin: DealershipsRead
) -> DealershipListResponse:
    """List every dealership."""
    return await list_dealerships_service(session)


@router.get("/dealerships/{dealership_id}", response_model=DealershipResponse)
async def admin_get_dealership(
    dealership_id: uuid.UUID, session: SessionDep, _admin: DealershipsRead
) -> DealershipResponse:
    """Return one dealership."""
    return await get_dealership_service(session, dealership_id)


@router.post(
    "/dealerships",
    response_model=DealershipResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_dealership(
    request: Request,
    payload: DealershipCreate,
    session: SessionDep,
    admin: DealershipsWrite,
) -> DealershipResponse:
    """Create a dealership."""
    return await create_dealership_service(
        session, actor=admin, payload=payload, request=request
    )


@router.patch("/dealerships/{dealership_id}", response_model=DealershipResponse)
async def admin_update_dealership(
    request: Request,
    dealership_id: uuid.UUID,
    payload: DealershipUpdate,
    session: SessionDep,
    admin: DealershipsWrite,
) -> DealershipResponse:
    """Edit a dealership."""
    return await update_dealership_service(
        session,
        actor=admin,
        dealership_id=dealership_id,
        payload=payload,
        request=request,
    )


@router.delete("/dealerships/{dealership_id}", response_model=Message)
async def admin_delete_dealership(
    request: Request,
    dealership_id: uuid.UUID,
    session: SessionDep,
    admin: DealershipsDelete,
) -> Message:
    """Delete a dealership that owns no quote."""
    return await delete_dealership_service(
        session, actor=admin, dealership_id=dealership_id, request=request
    )
