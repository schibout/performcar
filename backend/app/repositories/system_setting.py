import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.system_setting import SystemSetting


async def get_system_setting_by_key(
    session: AsyncSession, key: str
) -> SystemSetting | None:
    """Return the override row for ``key``, or ``None`` if no override exists.

    Used on the value-resolution hot path; the editor relationship is not
    eager-loaded here since callers only read ``value``.
    """
    statement = select(SystemSetting).where(SystemSetting.key == key)
    return (await session.execute(statement)).scalars().first()


async def get_all_system_settings(session: AsyncSession) -> Sequence[SystemSetting]:
    """Return every override row with its last editor loaded (admin view).

    ``updater`` is eager-loaded with ``selectinload`` so serializing the admin
    settings page never triggers a per-row lazy load (no N+1).
    """
    statement = select(SystemSetting).options(selectinload(SystemSetting.updater))
    return (await session.execute(statement)).scalars().all()


async def upsert_system_setting(
    session: AsyncSession,
    *,
    key: str,
    value: str,
    updated_by: uuid.UUID | None,
) -> SystemSetting:
    """Create or update the override row for ``key`` and return it.

    Inserting applies the ``utc_now`` default to ``updated_at``; updating an
    existing row bumps it via the column's ``onupdate`` hook.
    """
    setting = await get_system_setting_by_key(session, key)
    if setting is None:
        setting = SystemSetting(key=key, value=value, updated_by=updated_by)
        session.add(setting)
    else:
        setting.value = value
        setting.updated_by = updated_by
    await session.commit()
    await session.refresh(setting)
    return setting
