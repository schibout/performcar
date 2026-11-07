import uuid
from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_mfa import UserMfa, UserMfaRecoveryCode


async def get_mfa(session: AsyncSession, user_id: uuid.UUID) -> UserMfa | None:
    """Return the MFA enrollment of a user, if any."""
    return await session.get(UserMfa, user_id)


async def upsert_pending_mfa(
    session: AsyncSession, user_id: uuid.UUID, secret_encrypted: str
) -> UserMfa | None:
    """Create or re-key a pending enrollment; None if one is already enabled.

    The update is conditional on ``enabled_at`` so an enabled enrollment cannot
    be reset, even by a request racing with the confirmation.
    """
    result = await session.execute(
        update(UserMfa)
        .where(UserMfa.user_id == user_id, UserMfa.enabled_at.is_(None))
        .values(secret_encrypted=secret_encrypted, last_used_step=None)
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        if await session.get(UserMfa, user_id) is not None:
            await session.commit()
            return None
        session.add(UserMfa(user_id=user_id, secret_encrypted=secret_encrypted))
    await session.commit()
    return await session.get(UserMfa, user_id, populate_existing=True)


async def enable_mfa(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    secret_encrypted: str,
    code_hashes: Iterable[str],
    enabled_at: datetime,
    step: int,
) -> bool:
    """Activate a pending enrollment and store its recovery codes atomically.

    Both writes share one transaction, so MFA is never enabled without codes.
    Returns False, writing nothing, if the enrollment is no longer pending or
    no longer holds ``secret_encrypted``, the secret the caller just verified.
    """
    result = await session.execute(
        update(UserMfa)
        .where(
            UserMfa.user_id == user_id,
            UserMfa.enabled_at.is_(None),
            UserMfa.secret_encrypted == secret_encrypted,
        )
        .values(enabled_at=enabled_at, last_used_step=step)
    )
    if result.rowcount != 1:  # type: ignore[attr-defined]
        await session.commit()
        return False
    await session.execute(
        delete(UserMfaRecoveryCode).where(UserMfaRecoveryCode.user_id == user_id)
    )
    session.add_all(
        UserMfaRecoveryCode(user_id=user_id, code_hash=h) for h in code_hashes
    )
    await session.commit()
    return True


async def update_last_used_step(
    session: AsyncSession, user_id: uuid.UUID, *, previous: int | None, step: int
) -> bool:
    """Atomically advance ``last_used_step``; False if it already moved (replay)."""
    condition = (
        UserMfa.last_used_step.is_(None)
        if previous is None
        else UserMfa.last_used_step == previous
    )
    result = await session.execute(
        update(UserMfa)
        .where(UserMfa.user_id == user_id, condition)
        .values(last_used_step=step)
    )
    await session.commit()
    return result.rowcount == 1  # type: ignore[attr-defined]


async def delete_mfa(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Remove a user's enrollment and all their recovery codes."""
    await session.execute(
        delete(UserMfaRecoveryCode).where(UserMfaRecoveryCode.user_id == user_id)
    )
    await session.execute(delete(UserMfa).where(UserMfa.user_id == user_id))
    await session.commit()


async def replace_recovery_codes(
    session: AsyncSession, user_id: uuid.UUID, code_hashes: Iterable[str]
) -> None:
    """Replace all of a user's recovery codes with the given hashes."""
    await session.execute(
        delete(UserMfaRecoveryCode).where(UserMfaRecoveryCode.user_id == user_id)
    )
    session.add_all(
        UserMfaRecoveryCode(user_id=user_id, code_hash=h) for h in code_hashes
    )
    await session.commit()


async def consume_recovery_code(
    session: AsyncSession, user_id: uuid.UUID, code_hash: str, *, used_at: datetime
) -> bool:
    """Mark an unused matching recovery code as used; False if none matched."""
    result = await session.execute(
        update(UserMfaRecoveryCode)
        .where(
            UserMfaRecoveryCode.user_id == user_id,
            UserMfaRecoveryCode.code_hash == code_hash,
            UserMfaRecoveryCode.used_at.is_(None),
        )
        .values(used_at=used_at)
    )
    await session.commit()
    return result.rowcount == 1  # type: ignore[attr-defined]


async def count_unused_recovery_codes(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Return how many recovery codes the user still has."""
    result = await session.execute(
        select(UserMfaRecoveryCode.id).where(
            UserMfaRecoveryCode.user_id == user_id,
            UserMfaRecoveryCode.used_at.is_(None),
        )
    )
    return len(result.all())
