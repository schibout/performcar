from fastapi import APIRouter

from app.api.deps import CurrentActiveUser, SessionDep
from app.schemas.announcement import ActiveBannerResponse
from app.services.announcement_service import get_active_banner_service

router = APIRouter()


@router.get("/active", response_model=ActiveBannerResponse)
async def get_active_announcement(
    _user: CurrentActiveUser, session: SessionDep
) -> ActiveBannerResponse:
    """Return the currently active banner announcement, or null."""
    return await get_active_banner_service(session)
