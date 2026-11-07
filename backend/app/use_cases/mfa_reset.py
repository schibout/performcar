"""Remove a user's MFA enrollment and end their sessions.

Lives in ``use_cases/`` because both the admin service and the last-resort CLI
need the exact same sequence.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_mfa import delete_mfa
from app.use_cases.revoke_user_sessions import revoke_all_user_sessions


async def reset_user_mfa(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Delete the enrollment, revoke every session and return how many ended.

    Sessions must go too: their tokens carry an ``mfa`` claim proven with the
    authenticator that is being removed.
    """
    await delete_mfa(session, user_id)
    return await revoke_all_user_sessions(session, user_id)
