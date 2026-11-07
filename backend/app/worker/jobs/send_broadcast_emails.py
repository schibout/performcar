"""Send a broadcast announcement to its target users by email.

Enqueued by the admin broadcast service when ``send_email`` is set. Recipients
are resolved from the announcement's stored audience (not passed in the job
payload, which stays tiny) and emailed in throttled batches so the provider's
rate limits are respected. Per-recipient failures are isolated — one bad
address never stops the fan-out — and the in-app notification already delivered
the announcement, so email is a best-effort extra channel.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import TypedDict

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.core.email import send_email
from app.repositories.announcement import get_announcement
from app.repositories.user import get_target_user_emails
from app.schemas.announcement import AnnouncementAudience
from app.schemas.user import SystemRole
from app.schemas.worker import BroadcastEmailJobResult
from app.services.admin.broadcast_email import build_broadcast_email

logger = logging.getLogger(__name__)


class JobContext(TypedDict, total=False):
    """Subset of the arq context this job relies on."""

    job_id: str


async def send_broadcast_emails(
    ctx: JobContext, announcement_id: str
) -> BroadcastEmailJobResult:
    """Email a broadcast announcement to its target users in throttled batches."""
    _ = ctx
    start = time.monotonic()

    # Load the announcement + recipients and build the email inside the session;
    # the slow SMTP sends happen afterwards so no DB connection is held open.
    async with AsyncSessionLocal() as session:
        announcement = await get_announcement(session, uuid.UUID(announcement_id))
        if announcement is None:
            logger.warning(
                "send_broadcast_emails: announcement not found",
                extra={"announcement_id": announcement_id},
            )
            return BroadcastEmailJobResult(sent=0, failed=0, duration_ms=0)

        role = (
            SystemRole(announcement.role_filter) if announcement.role_filter else None
        )
        recipients = await get_target_user_emails(
            session,
            audience=AnnouncementAudience(announcement.audience),
            role=role,
        )
        email = build_broadcast_email(announcement)

    sent = 0
    failed = 0
    batch_size = settings.BROADCAST_EMAIL_BATCH_SIZE
    for offset in range(0, len(recipients), batch_size):
        batch = recipients[offset : offset + batch_size]
        for user_id, address in batch:
            ok = await send_email(
                to=address,
                subject=email.subject,
                body=email.html,
                plain_text=email.text,
                user_id=str(user_id),
            )
            sent += 1 if ok else 0
            failed += 0 if ok else 1
        # Throttle between batches to respect provider rate limits.
        if offset + batch_size < len(recipients):
            await asyncio.sleep(settings.BROADCAST_EMAIL_THROTTLE_SECONDS)

    duration_ms = int((time.monotonic() - start) * 1000)
    result = BroadcastEmailJobResult(sent=sent, failed=failed, duration_ms=duration_ms)
    logger.info(
        "send_broadcast_emails: completed",
        extra={**result.model_dump(), "announcement_id": announcement_id},
    )
    return result
