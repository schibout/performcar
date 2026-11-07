"""Login steps shared by the password flow and the MFA flow.

Lives in ``use_cases/`` so ``auth_service`` and ``mfa_service`` can both use
them without a service-to-service call.
"""

import uuid
from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email
from app.core.security import decode_token_payload
from app.models.user import User
from app.models.user_session import UserSession
from app.repositories.user_session import create_session
from app.utils.email_templates import generate_account_locked_email


async def notify_account_locked(user: User) -> None:
    """Email the user that their account was just locked (best-effort)."""
    lock_minutes = max(1, settings.LOGIN_LOCKOUT_SECONDS // 60)
    email_data = generate_account_locked_email(
        project_name=settings.PROJECT_NAME,
        lock_minutes=lock_minutes,
        lang=settings.DEFAULT_LANGUAGE,
    )
    await send_email(
        to=user.email,
        subject=email_data["subject"],
        body=email_data["html"],
        plain_text=email_data["plain_text"],
        user_id=str(user.id),
        is_html=True,
    )


def refresh_claims(refresh_token: str) -> dict:
    """Decode a just-minted refresh token's claims (jti + exp for the session row)."""
    claims = decode_token_payload(refresh_token, expected_type="refresh")
    if claims is None:  # pragma: no cover - we minted the token one line above
        raise RuntimeError("freshly minted refresh token failed to decode")
    return claims


async def open_session(
    request: Request | None,
    session: AsyncSession,
    user: User,
    session_id: uuid.UUID,
    refresh_token: str,
) -> None:
    """Persist the UserSession row backing a freshly issued token pair.

    Device metadata is truncated to the column sizes so a hostile header can
    never fail the insert.
    """
    claims = refresh_claims(refresh_token)
    user_agent = request.headers.get("user-agent") if request else None
    ip_address = request.client.host if request and request.client else None
    await create_session(
        session,
        UserSession(
            id=session_id,
            user_id=user.id,
            refresh_jti=claims["jti"],
            user_agent=user_agent[:512] if user_agent else None,
            ip_address=ip_address[:45] if ip_address else None,
            expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC),
        ),
    )
