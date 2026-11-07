import logging

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.arq import get_arq_pool
from app.core.broadcast_templates import template_exists
from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.announcement import Announcement
from app.models.user import User
from app.repositories.announcement import (
    create_announcement,
    deactivate_other_banners,
    get_announcement,
    list_announcements,
)
from app.repositories.user import get_target_user_ids
from app.schemas.announcement import (
    AnnouncementKind,
    AnnouncementListResponse,
    AnnouncementRead,
    BroadcastCreate,
    BroadcastCreateResponse,
)
from app.schemas.common import JsonValue
from app.schemas.notification import NotificationType
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.log_activity import log_activity
from app.use_cases.notify import notify_many

logger = logging.getLogger(__name__)


async def create_broadcast_service(
    session: AsyncSession,
    *,
    admin: User,
    payload: BroadcastCreate,
    request: Request | None = None,
) -> BroadcastCreateResponse:
    """Compose, persist, and fan out a broadcast announcement."""
    # Runtime guard: a template announcement must reference a known catalog key.
    if payload.kind == AnnouncementKind.TEMPLATE and not template_exists(
        payload.template_key
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.ANNOUNCEMENT_TEMPLATE_NOT_FOUND,
        )

    # JSON-safe view of the content (enum keys / nested models flattened).
    dumped = payload.model_dump(mode="json")

    announcement = Announcement(
        kind=payload.kind.value,
        template_key=payload.template_key,
        variables=dumped["variables"],
        translations=dumped["translations"],
        level=payload.level.value,
        audience=payload.audience.value,
        role_filter=payload.role_filter.value if payload.role_filter else None,
        show_banner=payload.show_banner,
        send_email=payload.send_email,
        created_by=admin.id,
    )
    announcement = await create_announcement(session, announcement)

    # A new banner supersedes any currently active one (single active banner).
    if payload.show_banner:
        await deactivate_other_banners(session, keep_id=announcement.id)

    target_ids = await get_target_user_ids(
        session, audience=payload.audience, role=payload.role_filter
    )

    # Everything the frontend needs to render this notification in the user's
    # own locale at view time.
    data: dict[str, JsonValue] = {
        "announcement_id": str(announcement.id),
        "kind": payload.kind.value,
        "level": payload.level.value,
        "show_banner": payload.show_banner,
    }
    if payload.kind == AnnouncementKind.TEMPLATE:
        data["template_key"] = payload.template_key
        data["variables"] = dumped["variables"]
    else:
        data["translations"] = dumped["translations"]

    await notify_many(
        session,
        user_ids=target_ids,
        notification_type=NotificationType.ADMIN_ANNOUNCEMENT,
        data=data,
    )

    # Best-effort email channel: the in-app notifications are already committed,
    # so a queue hiccup must not fail the request — log and move on.
    if payload.send_email:
        try:
            pool = get_arq_pool()
            await pool.enqueue_job("send_broadcast_emails", str(announcement.id))
        except Exception:  # noqa: BLE001 - email is a best-effort extra channel
            logger.exception(
                "Failed to enqueue broadcast email job",
                extra={"announcement_id": str(announcement.id)},
            )

    await log_activity(
        session,
        user_id=admin.id,
        activity_type=ActivityType.EXECUTE,
        resource_type=ResourceType.ANNOUNCEMENT,
        resource_id=announcement.id,
        request=request,
    )

    detail = await get_announcement(session, announcement.id)
    return BroadcastCreateResponse(
        announcement=AnnouncementRead.model_validate(detail),
        recipients=len(target_ids),
        message=SuccessMessages.BROADCAST_SENT,
    )


async def list_broadcasts_service(
    session: AsyncSession, *, skip: int = 0, limit: int = 50
) -> AnnouncementListResponse:
    """Return the paginated admin history of sent announcements."""
    rows, total = await list_announcements(session, skip=skip, limit=limit)
    return AnnouncementListResponse(
        data=[AnnouncementRead.model_validate(row) for row in rows],
        total=total,
        skip=skip,
        limit=limit,
    )
