from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.announcement import get_active_banner
from app.schemas.announcement import ActiveBannerResponse, AnnouncementRead


async def get_active_banner_service(session: AsyncSession) -> ActiveBannerResponse:
    """Return the currently active banner announcement, or null."""
    banner = await get_active_banner(session)
    return ActiveBannerResponse(
        announcement=AnnouncementRead.model_validate(banner) if banner else None
    )
