import hashlib
import time

import pyotp
import pytest
from cryptography.fernet import Fernet
from pydantic import ValidationError

from app.core import mfa
from app.core.config import Settings

BASE = {
    "PROJECT_NAME": "Test",
    "POSTGRES_SERVER": "localhost",
    "POSTGRES_USER": "u",
    "POSTGRES_PASSWORD": "pw-not-default",
    "FIRST_SUPERUSER": "a@example.com",
    "FIRST_SUPERUSER_PASSWORD": "pw-not-default",
    "SECRET_KEY": "s" * 40,
}


@pytest.fixture(autouse=True)
def _explicit_secret_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Satisfy the non-local rule that SECRET_KEY comes from the environment."""
    monkeypatch.setenv("SECRET_KEY", BASE["SECRET_KEY"])


def _settings(**overrides: object) -> Settings:
    """Build Settings from explicit values, ignoring any .env file."""
    return Settings(_env_file=None, **{**BASE, **overrides})  # type: ignore[arg-type]


def test_valid_totp_code_is_accepted_and_returns_step() -> None:
    """A current code validates and returns its time step."""
    secret = mfa.generate_totp_secret()
    code = pyotp.TOTP(secret).now()
    step = mfa.verify_totp(secret, code, None)
    assert step is not None
    assert abs(step - int(time.time() // 30)) <= 1


def test_wrong_totp_code_is_rejected() -> None:
    """A wrong code returns None."""
    secret = mfa.generate_totp_secret()
    good = pyotp.TOTP(secret).now()
    bad = "000000" if good != "000000" else "111111"
    assert mfa.verify_totp(secret, bad, None) is None
    assert mfa.verify_totp(secret, "abc", None) is None
    assert mfa.verify_totp(secret, "١٢٣٤٥٦", None) is None
    assert mfa.verify_totp(secret, "²" * 6, None) is None


def test_replayed_totp_code_is_rejected() -> None:
    """The same code is refused once its step was recorded."""
    secret = mfa.generate_totp_secret()
    code = pyotp.TOTP(secret).now()
    step = mfa.verify_totp(secret, code, None)
    assert step is not None
    assert mfa.verify_totp(secret, code, step) is None


def test_encrypt_decrypt_round_trip() -> None:
    """Encrypted secrets differ from plaintext and decrypt back."""
    secret = mfa.generate_totp_secret()
    token = mfa.encrypt_secret(secret)
    assert token != secret
    assert mfa.decrypt_secret(token) == secret


def test_provisioning_uri_contains_issuer_and_email() -> None:
    """The otpauth URI carries issuer and account."""
    uri = mfa.provisioning_uri("JBSWY3DPEHPK3PXP", "a@example.com", "My Site")
    assert uri.startswith("otpauth://totp/")
    assert "issuer=My%20Site" in uri
    assert "a%40example.com" in uri


def test_recovery_codes_are_ten_unique_and_formatted() -> None:
    """Ten unique XXXXX-XXXXX codes are generated."""
    codes = mfa.generate_recovery_codes()
    assert len(codes) == 10
    assert len(set(codes)) == 10
    for c in codes:
        left, right = c.split("-")
        assert len(left) == len(right) == 5


def test_hash_recovery_code_is_deterministic_hmac() -> None:
    """Hashing is stable, keyed and not the plain code."""
    h = mfa.hash_recovery_code("ABCDE-FGHIJ")
    assert h == mfa.hash_recovery_code("ABCDE-FGHIJ")
    assert h != mfa.hash_recovery_code("ABCDE-FGHIK")
    assert h != hashlib.sha256(b"ABCDE-FGHIJ").hexdigest()
    assert len(h) == 64


def test_mfa_is_off_by_default() -> None:
    """MFA is dormant unless explicitly enabled."""
    assert Settings.model_fields["ADMIN_MFA_REQUIRED"].default is False
    assert _settings().ADMIN_MFA_REQUIRED is False


@pytest.mark.parametrize("environment", ["staging", "production"])
def test_non_local_boots_with_mfa_off_and_no_key(environment: str) -> None:
    """With MFA off, no encryption key is needed and none is invented."""
    s = _settings(ENVIRONMENT=environment)
    assert s.ADMIN_MFA_REQUIRED is False
    assert s.MFA_ENCRYPTION_KEY is None


@pytest.mark.parametrize("environment", ["staging", "production"])
def test_non_local_with_mfa_on_requires_encryption_key(environment: str) -> None:
    """Outside local, enabling MFA without a key is refused."""
    with pytest.raises(ValidationError, match="MFA_ENCRYPTION_KEY"):
        _settings(ENVIRONMENT=environment, ADMIN_MFA_REQUIRED=True)


def test_non_local_with_mfa_on_accepts_explicit_key() -> None:
    """Production with MFA on and a valid key boots."""
    key = Fernet.generate_key().decode()
    s = _settings(
        ENVIRONMENT="production", ADMIN_MFA_REQUIRED=True, MFA_ENCRYPTION_KEY=key
    )
    assert s.ADMIN_MFA_REQUIRED is True
    assert s.MFA_ENCRYPTION_KEY == key


def test_invalid_key_is_refused() -> None:
    """A malformed key is refused even locally."""
    with pytest.raises(ValidationError, match="MFA_ENCRYPTION_KEY"):
        _settings(MFA_ENCRYPTION_KEY="not-a-fernet-key")


def test_invalid_key_is_refused_with_mfa_off() -> None:
    """A malformed key is refused in production even while MFA is off."""
    with pytest.raises(ValidationError, match="MFA_ENCRYPTION_KEY"):
        _settings(ENVIRONMENT="production", MFA_ENCRYPTION_KEY="not-a-fernet-key")


def test_local_without_key_derives_one_from_secret_key() -> None:
    """Local dev derives a valid Fernet key from SECRET_KEY."""
    s = _settings()
    assert s.MFA_ENCRYPTION_KEY is not None
    Fernet(s.MFA_ENCRYPTION_KEY)
    assert s.MFA_ENCRYPTION_KEY == _settings().MFA_ENCRYPTION_KEY


def test_local_allows_mfa_enabled_without_key() -> None:
    """Locally MFA can be switched on without a key, and the defaults hold."""
    s = _settings(ADMIN_MFA_REQUIRED=True)
    assert s.ADMIN_MFA_REQUIRED is True
    Fernet(s.MFA_ENCRYPTION_KEY)
    assert _settings().MFA_CHALLENGE_MINUTES == 5
