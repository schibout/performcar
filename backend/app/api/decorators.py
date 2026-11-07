"""Cross-cutting route decorators.

Kept separate from ``api/deps.py`` because FastAPI ``Depends`` belong there
and mixing the two makes it harder to spot what is pure wrapper vs. DI.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Mapping
from functools import wraps
from typing import ParamSpec, TypeVar

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user_activity import ActivityStatus, ActivityType, ResourceType
from app.use_cases.log_activity import log_activity

logger = logging.getLogger(__name__)

P = ParamSpec("P")
R = TypeVar("R")


def audit_unexpected_failure(
    *,
    activity_type: ActivityType,
    resource_type: ResourceType,
    endpoint: str,
) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    """Log unexpected failures of a route handler and re-raise the original error.

    ``HTTPException`` is passed through unchanged so FastAPI's own response
    logic still runs. Every other exception is recorded against the caller
    (no user when we cannot yet identify them) and re-raised so the global
    exception handler can convert it to a 500 with the full traceback intact.
    The request's uncommitted work is rolled back first, and a failure of the
    audit itself is logged without replacing the original exception.
    """

    def decorator(func: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as exc:
                session = _find_kwarg(kwargs, AsyncSession)
                if session is not None:
                    try:
                        # Read the id first: the rollback expires loaded objects.
                        current_user = _find_kwarg(kwargs, User)
                        user_id = current_user.id if current_user else None
                        # The audit commit must not persist the failed work.
                        await session.rollback()
                        await log_activity(
                            session=session,
                            user_id=user_id,
                            activity_type=activity_type,
                            resource_type=resource_type,
                            status=ActivityStatus.FAILURE,
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            # Only the type: database error messages embed bound
                            # parameters, which may be secrets.
                            details={
                                "error": type(exc).__name__,
                                "endpoint": endpoint,
                            },
                            request=_find_kwarg(kwargs, Request),
                        )
                    except Exception:
                        logger.exception("Failed to audit a failure of %s", endpoint)
                raise

        return wrapper

    return decorator


def _find_kwarg[T](kwargs: Mapping[str, object], expected_type: type[T]) -> T | None:
    """Return the first kwarg whose runtime type matches ``expected_type``.

    Route signatures vary (``session``/``db``, ``current_user`` may be
    ``CurrentUser`` or ``CurrentActiveUser``), so look up by type instead of
    name to keep the decorator generic.
    """
    for value in kwargs.values():
        if isinstance(value, expected_type):
            return value
    return None
