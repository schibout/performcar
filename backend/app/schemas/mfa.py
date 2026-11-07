from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.user import UserMe

# Longer than any TOTP or recovery code plus stray whitespace.
_MFA_CODE_MAX_LENGTH = 64


class MfaCodeRequest(BaseModel):
    """A TOTP code or recovery code submitted by the user."""

    code: str = Field(min_length=1, max_length=_MFA_CODE_MAX_LENGTH)


class MfaChallengeResponse(BaseModel):
    """Login response when a password was accepted but MFA must still be passed."""

    mfa_required: Literal[True] = True
    enrollment_required: bool
    message: str | None = None


class MfaEnrollStartResponse(BaseModel):
    """The pending TOTP secret, to import into an authenticator app."""

    secret: str
    otpauth_uri: str


class MfaEnrollConfirmResponse(BaseModel):
    """Enrollment result; the recovery codes are shown this one time only."""

    user: UserMe
    recovery_codes: list[str]
    message: str | None = None
