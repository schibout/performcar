"""Assemble the payload of the signed-in account.

Lives in ``use_cases/`` because ``/users/me``, the login flows and the profile
update all answer with it, and services cannot call one another.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import SystemRole, UserMe, UserPublic
from app.use_cases.permissions import get_usable_permissions


async def build_user_me(session: AsyncSession, user: User) -> UserMe:
    """Assemble the ``/users/me`` payload, attaching the account's permissions.

    Every account carries the keys it can actually use, except superadmins: they
    bypass every check by role alone, so the field is omitted for them.
    """
    # Validate through UserPublic first: ``UserMe.model_validate(user)`` would
    # try to read the ORM ``permissions`` relationship (lazy + async) during
    # validation and raise MissingGreenlet. UserPublic has no such field, so it
    # is safe; the permission list is then attached explicitly.
    me = UserMe.model_validate(UserPublic.model_validate(user).model_dump())
    if user.role != SystemRole.SUPERADMIN.value:
        me.permissions = await get_usable_permissions(session, user)
    return me
