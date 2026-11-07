"""Purge anonymized audit rows once their retention period has elapsed.

Rows whose account was deleted (or that never had one, such as unknown-email
login attempts) are kept for ``ANONYMIZED_AUDIT_RETENTION_DAYS`` and then
removed in bounded batches. Rows of living accounts are never touched.
"""

from __future__ import annotations

import logging
import time
from datetime import timedelta
from typing import TypedDict

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.repositories.user_activity import purge_anonymized_activities as purge_repo
from app.schemas.worker import AuditPurgeJobResult
from app.utils import utc_now

logger = logging.getLogger(__name__)


class JobContext(TypedDict, total=False):
    """Subset of the arq context this job relies on (none of it, currently)."""

    job_id: str


async def purge_anonymized_activities(ctx: JobContext) -> AuditPurgeJobResult:
    """Delete anonymized audit rows older than the retention window."""
    _ = ctx
    start = time.monotonic()
    cutoff = utc_now() - timedelta(days=settings.ANONYMIZED_AUDIT_RETENTION_DAYS)

    async with AsyncSessionLocal() as session:
        purged = await purge_repo(
            session,
            cutoff=cutoff,
            batch_size=settings.DELETION_JOB_BATCH_SIZE,
        )

    duration_ms = int((time.monotonic() - start) * 1000)
    result = AuditPurgeJobResult(purged=purged, duration_ms=duration_ms)
    logger.info("purge_anonymized_activities: completed", extra=result.model_dump())
    return result
