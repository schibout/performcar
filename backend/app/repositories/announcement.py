import uuid
from collections.abc import Sequence

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.announcement import Announcement


async def create_announcement(
    session: AsyncSession, announcement: Announcement
) -> Announcement:
    """Persist a new announcement."""
    session.add(announcement)
    await session.commit()
    await session.refresh(announcement)
    return announcement


async def get_announcement(
    session: AsyncSession, announcement_id: uuid.UUID
) -> Announcement | None:
    """Get a single announcement by id, with its sending admin loaded."""
    statement = (
        select(Announcement)
        .where(Announcement.id == announcement_id)
        .options(selectinload(Announcement.creator))
    )
    return (await session.execute(statement)).scalars().first()


async def list_announcements(
    session: AsyncSession, *, skip: int = 0, limit: int = 50
) -> tuple[Sequence[Announcement], int]:
    """Return announcements (newest first) plus total count, for admin history.

    ``creator`` is eager-loaded with ``selectinload`` so serializing the page to
    ``AnnouncementRead`` never triggers a per-row lazy load (no N+1).
    """
    count_stmt = select(func.count()).select_from(Announcement)
    total = (await session.execute(count_stmt)).scalar_one()

    list_stmt = (
        select(Announcement)
        .options(selectinload(Announcement.creator))
        .order_by(Announcement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    announcements = (await session.execute(list_stmt)).scalars().all()
    return announcements, total


async def deactivate_other_banners(
    session: AsyncSession, *, keep_id: uuid.UUID
) -> None:
    """Clear ``show_banner`` on every announcement except ``keep_id``.

    Keeps the active banner a singleton: activating a new banner supersedes the
    previously active one (only one banner is ever shown at a time).
    """
    statement = (
        update(Announcement)
        .where(Announcement.show_banner.is_(True), Announcement.id != keep_id)
        .values(show_banner=False)
    )
    await session.execute(statement)
    await session.commit()


async def get_active_banner(session: AsyncSession) -> Announcement | None:
    """Return the most recent banner announcement, or ``None``.

    Backs the ``active_announcement`` field embedded in ``/users/me`` and the
    fallback ``GET /announcements/active`` endpoint. Served by the
    ``(show_banner, created_at)`` index.
    """
    statement = (
        select(Announcement)
        .where(Announcement.show_banner.is_(True))
        .options(selectinload(Announcement.creator))
        .order_by(Announcement.created_at.desc())
        .limit(1)
    )
    return (await session.execute(statement)).scalars().first()
