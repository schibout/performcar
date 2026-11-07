"""TOTP, secret encryption and recovery-code primitives for admin MFA."""

import hashlib
import hmac
import secrets
import time

import pyotp
from cryptography.fernet import Fernet

from app.core.config import settings
from app.schemas.user import SystemRole

TOTP_INTERVAL_SECONDS = 30
TOTP_VALID_WINDOW = 1
RECOVERY_CODE_COUNT = 10
RECOVERY_CODE_GROUP_LENGTH = 5
# Unambiguous alphabet (no 0/O, 1/I/L) so codes are easy to copy by hand.
RECOVERY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def admin_mfa_required(role: str) -> bool:
    """Return whether an account with ``role`` must prove a second factor."""
    return settings.ADMIN_MFA_REQUIRED and role in (
        SystemRole.ADMIN,
        SystemRole.SUPERADMIN,
    )


def _fernet() -> Fernet:
    """Build the Fernet cipher from the configured MFA encryption key."""
    return Fernet(settings.MFA_ENCRYPTION_KEY.encode())  # type: ignore[union-attr]


def generate_totp_secret() -> str:
    """Return a new random base32 TOTP secret."""
    return pyotp.random_base32()


def encrypt_secret(secret: str) -> str:
    """Encrypt a TOTP secret for storage."""
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(token: str) -> str:
    """Decrypt a stored TOTP secret."""
    return _fernet().decrypt(token.encode()).decode()


def provisioning_uri(secret: str, email: str, issuer: str) -> str:
    """Build the otpauth:// URI that authenticator apps import."""
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, code: str, last_used_step: int | None) -> int | None:
    """Validate a TOTP code and return its time step, or None.

    Accepts the current step plus or minus ``TOTP_VALID_WINDOW``. A step that is
    not strictly greater than ``last_used_step`` is rejected, so a code cannot
    be replayed once its step has been recorded.
    """
    if not (code.isascii() and code.isdigit()):
        return None
    totp = pyotp.TOTP(secret, interval=TOTP_INTERVAL_SECONDS)
    current = int(time.time() // TOTP_INTERVAL_SECONDS)
    matched: int | None = None
    for step in range(current - TOTP_VALID_WINDOW, current + TOTP_VALID_WINDOW + 1):
        expected = totp.at(step * TOTP_INTERVAL_SECONDS)
        if secrets.compare_digest(expected, code):
            matched = step
    if matched is None:
        return None
    if last_used_step is not None and matched <= last_used_step:
        return None
    return matched


def generate_recovery_codes() -> list[str]:
    """Return ten unique one-time recovery codes formatted XXXXX-XXXXX."""
    codes: set[str] = set()
    while len(codes) < RECOVERY_CODE_COUNT:
        left, right = (
            "".join(
                secrets.choice(RECOVERY_CODE_ALPHABET)
                for _ in range(RECOVERY_CODE_GROUP_LENGTH)
            )
            for _ in range(2)
        )
        codes.add(f"{left}-{right}")
    return list(codes)


def hash_recovery_code(code: str) -> str:
    """Return the HMAC-SHA256 hex digest of a recovery code keyed by SECRET_KEY."""
    return hmac.new(
        settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256
    ).hexdigest()
