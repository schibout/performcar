from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin.stats import get_admin_stats
from app.schemas.admin import AdminStats


async def get_admin_stats_service(session: AsyncSession) -> AdminStats:
    """Return the aggregate dashboard counts as a validated response model."""
    return AdminStats(**await get_admin_stats(session))
