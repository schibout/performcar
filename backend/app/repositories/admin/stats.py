from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_activity import UserActivity
from app.schemas.user import SystemRole
from app.utils import utc_now


async def get_admin_stats(session: AsyncSession) -> dict[str, int]:
    """Return aggregate counts used by the admin dashboard.

    ``users_admins`` covers admin and superadmin roles; ``activities_today``
    counts activities since 00:00 UTC of the current day."""
    stmt = select(
        func.count(User.id).label("users_total"),
        func.count().filter(User.is_active.is_(True)).label("users_active"),
        func.count().filter(User.is_verified.is_(True)).label("users_verified"),
        func.count()
        .filter(User.role.in_([SystemRole.ADMIN.value, SystemRole.SUPERADMIN.value]))
        .label("users_admins"),
    )
    row = (await session.execute(stmt)).one()

    activities_total = (
        await session.execute(select(func.count()).select_from(UserActivity))
    ).scalar_one()

    start_of_day = utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    activities_today = (
        await session.execute(
            select(func.count())
            .select_from(UserActivity)
            .where(UserActivity.created_at >= start_of_day)
        )
    ).scalar_one()

    return {
        "users_total": row.users_total,
        "users_active": row.users_active,
        "users_verified": row.users_verified,
        "users_admins": row.users_admins,
        "activities_total": activities_total,
        "activities_today": activities_today,
    }
