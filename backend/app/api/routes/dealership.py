"""The caller's own dealership."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.api.deps import SessionDep, require_user_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.quote import DealershipResponse, DealershipUpdate
from app.services.dealership_service import (
    get_my_dealership_service,
    update_my_dealership_service,
)

router = APIRouter()

DealershipReader = Annotated[
    User, Depends(require_user_permission(Permission.SELF_DEALERSHIP_READ))
]
DealershipWriter = Annotated[
    User, Depends(require_user_permission(Permission.SELF_DEALERSHIP_WRITE))
]


@router.get("", response_model=DealershipResponse)
async def read_my_dealership(
    session: SessionDep, current_user: DealershipReader
) -> DealershipResponse:
    """Return the dealership the caller works for."""
    return await get_my_dealership_service(session, user=current_user)


@router.patch("", response_model=DealershipResponse)
async def update_my_dealership(
    request: Request,
    payload: DealershipUpdate,
    session: SessionDep,
    current_user: DealershipWriter,
) -> DealershipResponse:
    """Edit the details of the dealership the caller works for."""
    return await update_my_dealership_service(
        session, user=current_user, payload=payload, request=request
    )
