"""Cross-cutting helper to emit a persistent in-app notification.

Lives in ``use_cases/`` (not the notification service) so any domain service —
support, admin, files — can emit notifications without a service-to-service
call, mirroring ``log_activity``.
"""

import uuid
from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.realtime import notifications_topic, publish_safe
from app.models.notification import Notification
from app.repositories.notification import create_notification
from app.schemas.common import JsonValue
from app.schemas.notification import (
    NotificationEventType,
    NotificationRead,
    NotificationRealtimeEvent,
    NotificationType,
)


async def notify(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    data: dict[str, JsonValue] | None = None,
) -> Notification:
    """Persist a notification for ``user_id`` and push it over their feed.

    The database row is the source of truth; the realtime publish is
    best-effort (``publish_safe``), so an offline user simply finds the
    notification in their inbox on the next fetch.
    """
    notification = Notification(
        user_id=user_id,
        type=notification_type.value,
        data=data or {},
    )
    notification = await create_notification(session, notification)

    await publish_safe(
        notifications_topic(user_id),
        NotificationRealtimeEvent(
            type=NotificationEventType.NOTIFICATION_CREATED,
            notification=NotificationRead.model_validate(notification),
        ),
    )
    return notification


CHUNK_SIZE = 500


async def notify_many(
    session: AsyncSession,
    *,
    user_ids: Sequence[uuid.UUID],
    notification_type: NotificationType,
    data: dict[str, JsonValue] | None = None,
    chunk_size: int = CHUNK_SIZE,
) -> int:
    """Persist one notification per user id and push it over each user's feed.

    Inserts in fixed-size chunks (one commit per chunk) so a large fan-out stays
    within DB parameter/memory limits. All recipients get the same payload — the
    language is resolved at render time — so the rows are cheap to build. The
    realtime publish per recipient is best-effort. Returns the number created.
    """
    ids = list(user_ids)
    payload = data or {}
    created = 0
    for start in range(0, len(ids), chunk_size):
        chunk = ids[start : start + chunk_size]
        notifications = [
            Notification(user_id=uid, type=notification_type.value, data=payload)
            for uid in chunk
        ]
        session.add_all(notifications)
        await session.commit()

        for notification in notifications:
            await publish_safe(
                notifications_topic(notification.user_id),
                NotificationRealtimeEvent(
                    type=NotificationEventType.NOTIFICATION_CREATED,
                    notification=NotificationRead.model_validate(notification),
                ),
            )
        created += len(notifications)
    return created
