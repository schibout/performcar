"""End every session of a user at once.

Lives in ``use_cases/`` because the admin session service and the MFA reset both
need the exact same sequence.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.realtime import account_topic, publish_safe
from app.repositories.user_session import flag_sessions_revoked, revoke_all_sessions
from app.schemas.account import AccountEvent, AccountEventType


async def revoke_all_user_sessions(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Revoke every live session of a user and return how many ended.

    Access tokens die immediately through the Redis sid flags, and the account
    socket broadcasts ``sessions_revoked`` so open tabs drop to the login screen
    without waiting for the next request.
    """
    revoked = await revoke_all_sessions(session, user_id=user_id)
    if revoked:
        await flag_sessions_revoked([row.id for row in revoked])
        await publish_safe(
            account_topic(user_id),
            AccountEvent(type=AccountEventType.SESSIONS_REVOKED),
        )
    return len(revoked)
