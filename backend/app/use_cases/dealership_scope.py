"""Resolve the dealership perimeter of a dealer request.

Lives in ``use_cases/`` because the quote, customer and dealership services all
apply the same rule: a dealer only ever reaches the data of its own dealership,
and an account without one reaches nothing.
"""

import uuid

from fastapi import HTTPException, status

from app.core.messages.error_message import ErrorMessages
from app.models.user import User


def require_dealership_scope(user: User) -> uuid.UUID:
    """Return the caller's dealership id, or refuse with 403 when it has none."""
    if user.dealership_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.NO_DEALERSHIP,
        )
    return user.dealership_id


def ensure_in_scope(owner_id: uuid.UUID | None, scope: uuid.UUID | None) -> bool:
    """Return whether a row owned by ``owner_id`` lies inside the scope.

    ``None`` as scope is the global (admin) perimeter.
    """
    return scope is None or owner_id == scope
