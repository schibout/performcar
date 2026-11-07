"""Second step of the admin login: TOTP, recovery codes and enrollment."""

import uuid
from dataclasses import dataclass
from typing import NoReturn

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.core.mfa import (
    decrypt_secret,
    encrypt_secret,
    generate_recovery_codes,
    generate_totp_secret,
    hash_recovery_code,
    provisioning_uri,
    verify_totp,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token_payload,
)
from app.models.user import User
from app.models.user_mfa import UserMfa
from app.repositories.login_attempts import (
    clear_login_attempts,
    is_login_locked,
    register_failed_login,
)
from app.repositories.token_blacklist import (
    add_token_to_blacklist,
    is_token_blacklisted,
)
from app.repositories.user import get_user_by_id
from app.repositories.user_mfa import (
    consume_recovery_code,
    enable_mfa,
    get_mfa,
    update_last_used_step,
    upsert_pending_mfa,
)
from app.schemas.mfa import MfaEnrollStartResponse
from app.schemas.token import AuthTokens
from app.schemas.user_activity import ActivityStatus, ActivityType, ResourceType
from app.use_cases.auth_session import notify_account_locked, open_session
from app.use_cases.log_activity import log_activity
from app.use_cases.user_me import build_user_me
from app.utils import utc_now

METHOD_TOTP = "totp"
METHOD_RECOVERY = "recovery"
METHOD_ENROLLMENT = "enrollment"


@dataclass
class MfaEnrollmentResult:
    """A session opened by enrollment, with the codes to show the user once."""

    tokens: AuthTokens
    recovery_codes: list[str]


async def _log_failure(
    request: Request,
    session: AsyncSession,
    user_id: uuid.UUID | None,
    status_code: int,
    reason: str,
    method: str | None = None,
) -> None:
    """Record a refused MFA step in the audit log."""
    details = {"reason": reason}
    if method:
        details["method"] = method
    await log_activity(
        session=session,
        user_id=user_id,
        activity_type=ActivityType.LOGIN,
        resource_type=ResourceType.AUTH,
        status=ActivityStatus.FAILURE,
        status_code=status_code,
        details=details,
        request=request,
    )


async def _reject_challenge(
    request: Request, session: AsyncSession, user_id: uuid.UUID | None
) -> NoReturn:
    """Audit and refuse a challenge that cannot be continued."""
    await _log_failure(
        request,
        session,
        user_id,
        status.HTTP_401_UNAUTHORIZED,
        "mfa_challenge_invalid",
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=ErrorMessages.MFA_CHALLENGE_INVALID,
    )


async def _reject_already_enabled(
    request: Request, session: AsyncSession, user_id: uuid.UUID
) -> NoReturn:
    """Audit and refuse an enrollment attempt on an account already enrolled."""
    await _log_failure(
        request, session, user_id, status.HTTP_409_CONFLICT, "mfa_already_enabled"
    )
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=ErrorMessages.MFA_ALREADY_ENABLED,
    )


async def _reject_code(
    request: Request, session: AsyncSession, user: User, method: str
) -> NoReturn:
    """Count a wrong code toward the lockout, audit it and refuse the attempt."""
    locked_now = await register_failed_login(user.email)
    if locked_now:
        await notify_account_locked(user)
        await _log_failure(
            request,
            session,
            user.id,
            status.HTTP_423_LOCKED,
            "account_locked",
            method,
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=ErrorMessages.ACCOUNT_LOCKED,
            headers={"Retry-After": str(settings.LOGIN_LOCKOUT_SECONDS)},
        )
    await _log_failure(
        request,
        session,
        user.id,
        status.HTTP_401_UNAUTHORIZED,
        "mfa_invalid_code",
        method,
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=ErrorMessages.MFA_INVALID_CODE,
    )


async def _load_challenge_user(
    request: Request, session: AsyncSession, mfa_token: str | None
) -> User:
    """Resolve an unconsumed challenge token to a user still allowed to log in.

    The account state is read again here because it may have changed since the
    password step: a lock or a suspension must stop the challenge at once.
    """
    claims = decode_token_payload(mfa_token, expected_type="mfa") if mfa_token else None
    user = await get_user_by_id(session, uuid.UUID(claims["sub"])) if claims else None
    if user is None or await is_token_blacklisted(mfa_token):  # type: ignore[arg-type]
        await _reject_challenge(request, session, user.id if user else None)

    if user.suspended_at is not None:
        await _log_failure(
            request,
            session,
            user.id,
            status.HTTP_403_FORBIDDEN,
            "account_suspended",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.ACCOUNT_SUSPENDED,
        )

    lock_ttl = await is_login_locked(user.email)
    if lock_ttl > 0:
        await _log_failure(
            request, session, user.id, status.HTTP_423_LOCKED, "account_locked"
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=ErrorMessages.ACCOUNT_LOCKED,
            headers={"Retry-After": str(lock_ttl)},
        )
    return user


async def _load_enabled_mfa(
    request: Request, session: AsyncSession, user: User
) -> UserMfa:
    """Return the user's active enrollment, refusing the challenge if none exists."""
    mfa = await get_mfa(session, user.id)
    if mfa is None or mfa.enabled_at is None:
        await _reject_challenge(request, session, user.id)
    return mfa


async def _complete_login(
    request: Request,
    session: AsyncSession,
    user: User,
    mfa_token: str,
    method: str,
) -> AuthTokens:
    """Consume the challenge token and open a session carrying the ``mfa`` claim."""
    await add_token_to_blacklist(mfa_token)
    await clear_login_attempts(user.email)
    await log_activity(
        session=session,
        user_id=user.id,
        activity_type=ActivityType.LOGIN,
        resource_type=ResourceType.AUTH,
        details={"method": method},
        request=request,
    )

    session_id = uuid.uuid4()
    access_token = create_access_token(user.id, session_id=session_id, mfa=True)
    refresh_token = create_refresh_token(user.id, session_id=session_id, mfa=True)
    await open_session(request, session, user, session_id, refresh_token)

    return AuthTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        user=await build_user_me(session, user),
        message=SuccessMessages.LOGIN_SUCCESS,
    )


async def consume_totp_code(session: AsyncSession, mfa: UserMfa, code: str) -> bool:
    """Accept a TOTP code once; a code replayed or losing the race returns False.

    ``update_last_used_step`` is the atomic replay guard: of two concurrent
    requests with the same code, only one advances the step.
    """
    step = verify_totp(
        decrypt_secret(mfa.secret_encrypted), code.strip(), mfa.last_used_step
    )
    if step is None:
        return False
    return await update_last_used_step(
        session, mfa.user_id, previous=mfa.last_used_step, step=step
    )


async def verify_mfa_service(
    request: Request, session: AsyncSession, mfa_token: str | None, code: str
) -> AuthTokens:
    """Finish a login with a TOTP code."""
    user = await _load_challenge_user(request, session, mfa_token)
    mfa = await _load_enabled_mfa(request, session, user)
    if not await consume_totp_code(session, mfa, code):
        await _reject_code(request, session, user, METHOD_TOTP)
    return await _complete_login(request, session, user, mfa_token, METHOD_TOTP)  # type: ignore[arg-type]


async def recover_mfa_service(
    request: Request, session: AsyncSession, mfa_token: str | None, code: str
) -> AuthTokens:
    """Finish a login with a single-use recovery code."""
    user = await _load_challenge_user(request, session, mfa_token)
    await _load_enabled_mfa(request, session, user)
    # Codes are hashed in their canonical form; people retype them by hand.
    code_hash = hash_recovery_code(code.strip().upper())
    if not await consume_recovery_code(session, user.id, code_hash, used_at=utc_now()):
        await _reject_code(request, session, user, METHOD_RECOVERY)
    return await _complete_login(request, session, user, mfa_token, METHOD_RECOVERY)  # type: ignore[arg-type]


async def start_mfa_enrollment_service(
    request: Request, session: AsyncSession, mfa_token: str | None
) -> MfaEnrollStartResponse:
    """Create a pending secret; an enabled enrollment is never replaced."""
    user = await _load_challenge_user(request, session, mfa_token)
    secret = generate_totp_secret()
    pending = await upsert_pending_mfa(session, user.id, encrypt_secret(secret))
    if pending is None:
        await _reject_already_enabled(request, session, user.id)
    await log_activity(
        session=session,
        user_id=user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.AUTH,
        details={"action": "mfa_enrollment_started"},
        request=request,
    )
    return MfaEnrollStartResponse(
        secret=secret,
        otpauth_uri=provisioning_uri(secret, user.email, settings.PROJECT_NAME),
    )


async def confirm_mfa_enrollment_service(
    request: Request, session: AsyncSession, mfa_token: str | None, code: str
) -> MfaEnrollmentResult:
    """Activate a pending enrollment with its first code and open a session."""
    user = await _load_challenge_user(request, session, mfa_token)
    mfa = await get_mfa(session, user.id)
    if mfa is None:
        await _reject_challenge(request, session, user.id)
    if mfa.enabled_at is not None:
        await _reject_already_enabled(request, session, user.id)

    step = verify_totp(
        decrypt_secret(mfa.secret_encrypted), code.strip(), mfa.last_used_step
    )
    if step is None:
        await _reject_code(request, session, user, METHOD_ENROLLMENT)

    recovery_codes = generate_recovery_codes()
    enabled = await enable_mfa(
        session,
        user.id,
        secret_encrypted=mfa.secret_encrypted,
        code_hashes=[hash_recovery_code(c) for c in recovery_codes],
        enabled_at=utc_now(),
        step=step,
    )
    # Lost to a concurrent confirmation or to a restart that replaced the secret.
    if not enabled:
        await _reject_challenge(request, session, user.id)

    tokens = await _complete_login(
        request,
        session,
        user,
        mfa_token,  # type: ignore[arg-type]
        METHOD_ENROLLMENT,
    )
    return MfaEnrollmentResult(tokens=tokens, recovery_codes=recovery_codes)
