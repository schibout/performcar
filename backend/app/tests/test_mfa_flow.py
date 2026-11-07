"""End-to-end tests for the admin MFA login flow and its enforcement."""

import json
import uuid
from collections.abc import AsyncIterator, Iterator
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import jwt
import pyotp
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import select, update

from app.api.routes.admin.support import admin_feed_ws
from app.cli import reset_mfa as reset_mfa_cli
from app.core.config import Settings, settings
from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.core.mfa import (
    encrypt_secret,
    generate_recovery_codes,
    generate_totp_secret,
    hash_recovery_code,
)
from app.core.security import create_access_token, create_mfa_token
from app.main import app
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_mfa import UserMfa, UserMfaRecoveryCode
from app.repositories.login_attempts import is_login_locked
from app.repositories.system_setting import upsert_system_setting
from app.repositories.user_mfa import enable_mfa, get_mfa, upsert_pending_mfa
from app.schemas.admin_permission import Permission
from app.schemas.user_activity import ActivityStatus, ActivityType
from app.tests.admin.conftest import (
    get_user_id,
    grant_permissions,
    login,
    promote_to_admin,
    promote_to_superadmin,
    register_and_verify,
)
from app.tests.conftest import TestingSessionLocal
from app.utils import utc_now

PASSWORD = "Password123!"


@pytest.fixture(autouse=True)
def require_admin_mfa(monkeypatch: pytest.MonkeyPatch) -> None:
    """Turn MFA enforcement on, overriding the suite-wide default."""
    monkeypatch.setattr(settings, "ADMIN_MFA_REQUIRED", True)


@pytest_asyncio.fixture
async def other_client() -> AsyncIterator[AsyncClient]:
    """A second browser, for a session that must not share the first's cookies."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url=f"http://test{settings.API_V1_STR}"
    ) as ac:
        yield ac


def totp_code(secret: str, offset: int = 0) -> str:
    """Return the TOTP code for the current time step plus ``offset`` steps."""
    totp = pyotp.TOTP(secret)
    return totp.at(utc_now().timestamp() + offset * totp.interval)


async def enroll(email: str) -> tuple[str, list[str]]:
    """Seed an enabled MFA enrollment and return its secret and recovery codes."""
    user_id = uuid.UUID(await get_user_id(email))
    secret = generate_totp_secret()
    encrypted = encrypt_secret(secret)
    codes = generate_recovery_codes()
    async with TestingSessionLocal() as session:
        await upsert_pending_mfa(session, user_id, encrypted)
        await enable_mfa(
            session,
            user_id,
            secret_encrypted=encrypted,
            code_hashes=[hash_recovery_code(code) for code in codes],
            enabled_at=utc_now(),
            step=0,
        )
    return secret, codes


async def create_admin(client: AsyncClient, email: str) -> None:
    """Register a verified plain admin with read grants and no MFA."""
    await register_and_verify(client, email)
    await promote_to_admin(email)
    await grant_permissions(email, [Permission.USERS_READ, Permission.SUPPORT_READ])


async def post_login(client: AsyncClient, email: str) -> Response:
    """Submit the password step of the login."""
    return await client.post(
        "/auth/login", data={"username": email, "password": PASSWORD}
    )


async def open_admin_session(client: AsyncClient, email: str) -> str:
    """Create an enrolled admin, sign them in with TOTP and return the secret."""
    await create_admin(client, email)
    secret, _ = await enroll(email)
    await post_login(client, email)
    response = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})
    assert response.status_code == 200, response.text
    return secret


async def audit_rows() -> list[UserActivity]:
    """Return every audit row written so far."""
    async with TestingSessionLocal() as session:
        return list((await session.execute(select(UserActivity))).scalars().all())


async def mfa_row(email: str) -> UserMfa | None:
    """Return the MFA enrollment of a user."""
    async with TestingSessionLocal() as session:
        return await get_mfa(session, uuid.UUID(await get_user_id(email)))


async def enable_maintenance() -> None:
    """Turn maintenance mode on directly in the DB."""
    async with TestingSessionLocal() as session:
        await upsert_system_setting(
            session, key="maintenance_mode", value="true", updated_by=None
        )


def access_claims(client: AsyncClient) -> dict:
    """Decode the claims of the client's access-token cookie."""
    return jwt.decode(
        client.cookies["access_token"], settings.SECRET_KEY, algorithms=["HS256"]
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_regular_user_login_is_unchanged(client: AsyncClient):
    """A plain user still receives a session from the password alone."""
    await register_and_verify(client, "user@test.com")

    response = await post_login(client, "user@test.com")

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "user@test.com"
    assert "mfa_required" not in body
    assert "access_token" in client.cookies
    assert "refresh_token" in client.cookies
    assert "mfa_token" not in client.cookies
    assert "mfa" not in access_claims(client)


@pytest.mark.asyncio
async def test_admin_password_alone_sets_no_session_cookie(client: AsyncClient):
    """The password step of an admin only yields a scoped challenge cookie."""
    await create_admin(client, "admin@test.com")
    await enroll("admin@test.com")

    response = await post_login(client, "admin@test.com")

    assert response.status_code == 200
    body = response.json()
    assert body["mfa_required"] is True
    assert body["enrollment_required"] is False
    assert body["message"] == SuccessMessages.MFA_CHALLENGE_REQUIRED
    assert "user" not in body
    assert "access_token" not in client.cookies
    assert "refresh_token" not in client.cookies

    set_cookies = response.headers.get_list("set-cookie")
    assert len(set_cookies) == 1
    cookie = set_cookies[0].lower()
    assert cookie.startswith("mfa_token=")
    assert "httponly" in cookie
    assert "samesite=strict" in cookie
    assert f"path={settings.API_V1_STR}/auth/mfa".lower() in cookie
    assert f"max-age={settings.MFA_CHALLENGE_MINUTES * 60}" in cookie


@pytest.mark.asyncio
async def test_superadmin_password_alone_sets_no_session_cookie(client: AsyncClient):
    """Superadmins go through the challenge too."""
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com", root=True)

    response = await post_login(client, "root@test.com")

    assert response.json()["mfa_required"] is True
    assert response.json()["enrollment_required"] is True
    assert "access_token" not in client.cookies


@pytest.mark.asyncio
async def test_default_settings_let_admin_password_login_open_a_session(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """With the flag at its default, the password alone reaches admin routes."""
    default = Settings.model_fields["ADMIN_MFA_REQUIRED"].default
    monkeypatch.setattr(settings, "ADMIN_MFA_REQUIRED", default)
    await create_admin(client, "admin@test.com")

    response = await post_login(client, "admin@test.com")

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "admin@test.com"
    assert "mfa_required" not in response.json()
    assert "access_token" in client.cookies
    assert "refresh_token" in client.cookies
    assert "mfa_token" not in client.cookies
    assert (await client.get("/admin/users")).status_code == 200
    # The dormant MFA routes stay shut: no login issues a challenge token.
    dormant = await client.post("/auth/mfa/verify", json={"code": "123456"})
    assert dormant.status_code == 401


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unenrolled_admin_must_enroll_and_gets_recovery_codes(
    client: AsyncClient,
):
    """Start and confirm open a session, return codes and store only hashes."""
    await create_admin(client, "admin@test.com")
    response = await post_login(client, "admin@test.com")
    assert response.json()["enrollment_required"] is True

    started = await client.post("/auth/mfa/enroll/start")
    assert started.status_code == 200
    secret = started.json()["secret"]
    assert started.json()["otpauth_uri"].startswith("otpauth://totp/")
    assert "access_token" not in client.cookies

    assert (await mfa_row("admin@test.com")).enabled_at is None

    confirmed = await client.post(
        "/auth/mfa/enroll/confirm", json={"code": totp_code(secret)}
    )
    assert confirmed.status_code == 200, confirmed.text
    body = confirmed.json()
    assert len(body["recovery_codes"]) == 10 and "access_token" in client.cookies
    assert body["user"]["email"] == "admin@test.com"
    assert body["message"] == SuccessMessages.MFA_ENROLLED
    assert "mfa_token" not in client.cookies
    assert access_claims(client)["mfa"] is True
    assert (await client.get("/admin/users")).status_code == 200

    row = await mfa_row("admin@test.com")
    assert row.enabled_at is not None
    assert row.secret_encrypted != secret

    async with TestingSessionLocal() as session:
        stored = (await session.execute(select(UserMfaRecoveryCode))).scalars().all()
    assert {r.code_hash for r in stored} == {
        hash_recovery_code(code) for code in body["recovery_codes"]
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "path,payload",
    [
        ("/auth/mfa/enroll/start", None),
        ("/auth/mfa/enroll/confirm", {"code": "000000"}),
    ],
)
async def test_enrollment_is_refused_once_mfa_is_enabled(
    client: AsyncClient, path: str, payload: dict | None
):
    """A password holder cannot replace an enabled authenticator."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    before = await mfa_row("admin@test.com")
    await post_login(client, "admin@test.com")

    response = await client.post(path, json=payload)

    assert response.status_code == 409
    assert response.json()["error"] == ErrorMessages.MFA_ALREADY_ENABLED
    after = await mfa_row("admin@test.com")
    assert after.enabled_at is not None
    assert after.secret_encrypted == before.secret_encrypted
    # The legitimate authenticator keeps working.
    verified = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})
    assert verified.status_code == 200


@pytest.mark.asyncio
async def test_upsert_pending_never_resets_an_enabled_enrollment(client: AsyncClient):
    """The repository guard holds even if a caller skips the service check."""
    await create_admin(client, "admin@test.com")
    await enroll("admin@test.com")
    user_id = uuid.UUID(await get_user_id("admin@test.com"))

    async with TestingSessionLocal() as session:
        assert await upsert_pending_mfa(session, user_id, "other") is None

    row = await mfa_row("admin@test.com")
    assert row.enabled_at is not None
    assert row.secret_encrypted != "other"


@pytest.mark.asyncio
async def test_enable_is_atomic_with_recovery_codes(client: AsyncClient):
    """A failure while storing the codes leaves MFA disabled and with no codes."""
    await create_admin(client, "admin@test.com")
    user_id = uuid.UUID(await get_user_id("admin@test.com"))
    encrypted = encrypt_secret(generate_totp_secret())
    async with TestingSessionLocal() as session:
        await upsert_pending_mfa(session, user_id, encrypted)

    def failing_hashes() -> Iterator[str]:
        """Yield one hash, then fail as a broken store would."""
        yield "a" * 64
        raise RuntimeError("store failure")

    with pytest.raises(RuntimeError):
        async with TestingSessionLocal() as session:
            await enable_mfa(
                session,
                user_id,
                secret_encrypted=encrypted,
                code_hashes=failing_hashes(),
                enabled_at=utc_now(),
                step=1,
            )

    assert (await mfa_row("admin@test.com")).enabled_at is None
    async with TestingSessionLocal() as session:
        stored = (await session.execute(select(UserMfaRecoveryCode))).scalars().all()
    assert stored == []


@pytest.mark.asyncio
async def test_enable_fails_when_the_secret_was_replaced(client: AsyncClient):
    """A confirmation cannot activate a secret other than the one it checked."""
    await create_admin(client, "admin@test.com")
    user_id = uuid.UUID(await get_user_id("admin@test.com"))
    async with TestingSessionLocal() as session:
        await upsert_pending_mfa(session, user_id, "current")
        assert (
            await enable_mfa(
                session,
                user_id,
                secret_encrypted="stale",
                code_hashes=["a" * 64],
                enabled_at=utc_now(),
                step=1,
            )
            is False
        )

    assert (await mfa_row("admin@test.com")).enabled_at is None


@pytest.mark.asyncio
async def test_confirm_failure_while_storing_keeps_mfa_disabled(client: AsyncClient):
    """A failure after the enable UPDATE is not persisted by the failure audit."""
    await create_admin(client, "admin@test.com")
    await post_login(client, "admin@test.com")
    started = await client.post("/auth/mfa/enroll/start")
    secret = started.json()["secret"]

    # ``delete`` runs inside the real ``enable_mfa``, right after its UPDATE.
    with patch(
        "app.repositories.user_mfa.delete",
        side_effect=RuntimeError("store failure"),
    ):
        with pytest.raises(RuntimeError, match="store failure"):
            await client.post(
                "/auth/mfa/enroll/confirm", json={"code": totp_code(secret)}
            )

    assert (await mfa_row("admin@test.com")).enabled_at is None
    assert "access_token" not in client.cookies
    rows = [
        r
        for r in await audit_rows()
        if r.details.get("endpoint") == "/mfa/enroll/confirm"
    ]
    assert len(rows) == 1
    assert rows[0].user_id is None
    assert rows[0].status == ActivityStatus.FAILURE
    assert rows[0].details["error"] == "RuntimeError"
    assert "store failure" not in json.dumps(rows[0].details)


@pytest.mark.asyncio
async def test_confirm_without_pending_enrollment_is_rejected(client: AsyncClient):
    """Confirming before starting enrollment fails and opens no session."""
    await create_admin(client, "admin@test.com")
    await post_login(client, "admin@test.com")

    response = await client.post("/auth/mfa/enroll/confirm", json={"code": "123456"})

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID
    assert "access_token" not in client.cookies


@pytest.mark.asyncio
async def test_wrong_confirmation_code_opens_no_session(client: AsyncClient):
    """A wrong code during enrollment is counted and leaves MFA disabled."""
    await create_admin(client, "admin@test.com")
    await post_login(client, "admin@test.com")
    await client.post("/auth/mfa/enroll/start")

    response = await client.post("/auth/mfa/enroll/confirm", json={"code": "abcdef"})

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_INVALID_CODE
    assert (await mfa_row("admin@test.com")).enabled_at is None
    assert "access_token" not in client.cookies


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_verify_opens_session_and_admin_route_is_reachable(client: AsyncClient):
    """A valid code issues claim-bearing tokens and removes the challenge cookie."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")
    assert (await client.get("/admin/users")).status_code == 401

    response = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "admin@test.com"
    assert response.json()["message"] == SuccessMessages.LOGIN_SUCCESS
    assert "mfa_token" not in client.cookies
    assert access_claims(client)["mfa"] is True
    assert (await client.get("/admin/users")).status_code == 200


@pytest.mark.asyncio
async def test_superadmin_route_is_reachable_after_verify(client: AsyncClient):
    """The superadmin gate accepts a claim-bearing session."""
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com", root=True)
    secret, _ = await enroll("root@test.com")
    await post_login(client, "root@test.com")
    await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    assert (await client.get("/admin/admins")).status_code == 200


@pytest.mark.asyncio
async def test_wrong_codes_lock_the_account(client: AsyncClient, mock_email_send):
    """The threshold failure returns 423; even a correct code is then refused."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")
    mock_email_send.reset_mock()

    for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS - 1):
        response = await client.post("/auth/mfa/verify", json={"code": "not-a-code"})
        assert response.status_code == 401
        assert response.json()["error"] == ErrorMessages.MFA_INVALID_CODE
    assert await is_login_locked("admin@test.com") == 0

    response = await client.post("/auth/mfa/verify", json={"code": "not-a-code"})
    assert response.status_code == 423
    assert response.json()["error"] == ErrorMessages.ACCOUNT_LOCKED
    assert await is_login_locked("admin@test.com") > 0
    mock_email_send.assert_awaited_once()

    correct = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})
    assert correct.status_code == 423
    assert "access_token" not in client.cookies
    assert (await post_login(client, "admin@test.com")).status_code == 423


@pytest.mark.asyncio
async def test_password_success_does_not_reset_the_code_failure_counter(
    client: AsyncClient,
):
    """Logging in again between wrong codes cannot dodge the lockout."""
    await create_admin(client, "admin@test.com")
    await enroll("admin@test.com")

    for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS - 1):
        await post_login(client, "admin@test.com")
        response = await client.post("/auth/mfa/verify", json={"code": "000000x"})
        assert response.status_code == 401

    await post_login(client, "admin@test.com")
    response = await client.post("/auth/mfa/verify", json={"code": "000000x"})
    assert response.status_code == 423


@pytest.mark.asyncio
async def test_successful_verify_resets_the_failure_counter(client: AsyncClient):
    """Completing the login clears earlier failures, as a password login does."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")
    for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS - 1):
        await client.post("/auth/mfa/verify", json={"code": "nope"})
    await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    await post_login(client, "admin@test.com")
    response = await client.post("/auth/mfa/verify", json={"code": "nope"})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_replayed_code_is_a_failed_attempt(client: AsyncClient):
    """A code already accepted cannot open a second session."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    code = totp_code(secret)
    await post_login(client, "admin@test.com")
    assert (
        await client.post("/auth/mfa/verify", json={"code": code})
    ).status_code == 200

    await post_login(client, "admin@test.com")
    response = await client.post("/auth/mfa/verify", json={"code": code})

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_INVALID_CODE


@pytest.mark.asyncio
async def test_lost_compare_and_set_is_a_failed_attempt(client: AsyncClient):
    """Losing the replay guard race fails the attempt and counts toward lockout."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")

    with patch(
        "app.services.mfa_service.update_last_used_step",
        new=AsyncMock(return_value=False),
    ):
        for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS - 1):
            response = await client.post(
                "/auth/mfa/verify", json={"code": totp_code(secret)}
            )
            assert response.status_code == 401
            assert response.json()["error"] == ErrorMessages.MFA_INVALID_CODE
        response = await client.post(
            "/auth/mfa/verify", json={"code": totp_code(secret)}
        )

    assert response.status_code == 423
    assert "access_token" not in client.cookies


@pytest.mark.asyncio
async def test_verify_without_enrollment_is_rejected(client: AsyncClient):
    """There is no TOTP path for an account that never finished enrolling."""
    await create_admin(client, "admin@test.com")
    await post_login(client, "admin@test.com")
    started = await client.post("/auth/mfa/enroll/start")

    response = await client.post(
        "/auth/mfa/verify", json={"code": totp_code(started.json()["secret"])}
    )

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID
    assert "access_token" not in client.cookies


@pytest.mark.asyncio
async def test_suspended_account_cannot_finish_a_challenge(client: AsyncClient):
    """A suspension landing mid-challenge stops the login."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")
    async with TestingSessionLocal() as session:
        await session.execute(
            update(User)
            .where(User.email == "admin@test.com")
            .values(suspended_at=utc_now())
        )
        await session.commit()

    response = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ACCOUNT_SUSPENDED
    assert "access_token" not in client.cookies


@pytest.mark.asyncio
async def test_mfa_outcomes_are_audited_without_email(client: AsyncClient):
    """Success and failure rows use LOGIN and identify the user by id only."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    user_id = await get_user_id("admin@test.com")
    await post_login(client, "admin@test.com")
    await client.post("/auth/mfa/verify", json={"code": "nope"})
    await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    rows = [
        r
        for r in await audit_rows()
        if r.details and str(r.details.get("method", "")) == "totp"
    ]
    assert {r.status for r in rows} == {ActivityStatus.FAILURE, ActivityStatus.SUCCESS}
    for row in rows:
        assert row.activity_type == ActivityType.LOGIN
        assert str(row.user_id) == user_id
        assert "admin@test.com" not in json.dumps(row.details)


@pytest.mark.asyncio
async def test_invalid_challenge_is_audited(client: AsyncClient):
    """A rejected challenge leaves a failure row."""
    response = await client.post("/auth/mfa/verify", json={"code": "123456"})

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID
    rows = await audit_rows()
    assert any(
        r.status == ActivityStatus.FAILURE
        and r.activity_type == ActivityType.LOGIN
        and r.details.get("reason") == "mfa_challenge_invalid"
        for r in rows
    )


# ---------------------------------------------------------------------------
# Recovery codes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_recovery_code_works_once(client: AsyncClient):
    """A recovery code opens one MFA session; its second use fails."""
    await create_admin(client, "admin@test.com")
    _, codes = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")

    response = await client.post("/auth/mfa/recovery", json={"code": codes[0]})

    assert response.status_code == 200
    assert access_claims(client)["mfa"] is True
    assert (await client.get("/admin/users")).status_code == 200

    await post_login(client, "admin@test.com")
    second = await client.post("/auth/mfa/recovery", json={"code": codes[0]})
    assert second.status_code == 401
    assert second.json()["error"] == ErrorMessages.MFA_INVALID_CODE


@pytest.mark.asyncio
@pytest.mark.parametrize("transform", [str.lower, lambda code: f"  {code}\t"])
async def test_recovery_code_input_is_normalized(client: AsyncClient, transform):
    """A code typed in lowercase or with stray whitespace still works."""
    await create_admin(client, "admin@test.com")
    _, codes = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")

    response = await client.post(
        "/auth/mfa/recovery", json={"code": transform(codes[0])}
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_wrong_recovery_codes_lock_the_account(client: AsyncClient):
    """Wrong recovery codes count toward the same lockout."""
    await create_admin(client, "admin@test.com")
    _, codes = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")

    for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS - 1):
        response = await client.post("/auth/mfa/recovery", json={"code": "WRONG-CODE1"})
        assert response.status_code == 401
    response = await client.post("/auth/mfa/recovery", json={"code": "WRONG-CODE1"})
    assert response.status_code == 423

    correct = await client.post("/auth/mfa/recovery", json={"code": codes[0]})
    assert correct.status_code == 423


# ---------------------------------------------------------------------------
# Challenge token
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mfa_token_is_single_use(client: AsyncClient, other_client: AsyncClient):
    """A consumed challenge token cannot be replayed, even with a fresh code."""
    await create_admin(client, "admin@test.com")
    secret, codes = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")
    token = client.cookies["mfa_token"]
    headers = {"Cookie": f"mfa_token={token}"}
    assert (
        await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})
    ).status_code == 200

    fresh = await other_client.post(
        "/auth/mfa/verify", json={"code": totp_code(secret, 1)}, headers=headers
    )
    recovery = await other_client.post(
        "/auth/mfa/recovery", json={"code": codes[0]}, headers=headers
    )

    assert fresh.status_code == 401
    assert fresh.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID
    assert recovery.status_code == 401
    assert "access_token" not in other_client.cookies


@pytest.mark.asyncio
async def test_confirm_consumes_the_mfa_token(
    client: AsyncClient, other_client: AsyncClient
):
    """The enrollment token cannot be replayed after confirmation."""
    await create_admin(client, "admin@test.com")
    await post_login(client, "admin@test.com")
    token = client.cookies["mfa_token"]
    secret = (await client.post("/auth/mfa/enroll/start")).json()["secret"]
    await client.post("/auth/mfa/enroll/confirm", json={"code": totp_code(secret)})

    response = await other_client.post(
        "/auth/mfa/verify",
        json={"code": totp_code(secret, 1)},
        headers={"Cookie": f"mfa_token={token}"},
    )

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID


@pytest.mark.asyncio
async def test_expired_mfa_token_is_rejected(client: AsyncClient):
    """A challenge token past its lifetime fails."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    user_id = await get_user_id("admin@test.com")
    now = utc_now()
    expired = jwt.encode(
        {
            "sub": user_id,
            "type": "mfa",
            "jti": str(uuid.uuid4()),
            "iat": (now - timedelta(minutes=10)).timestamp(),
            "exp": (now - timedelta(minutes=5)).timestamp(),
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )

    response = await client.post(
        "/auth/mfa/verify",
        json={"code": totp_code(secret)},
        headers={"Cookie": f"mfa_token={expired}"},
    )

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID


@pytest.mark.asyncio
async def test_mfa_token_claims_and_lifetime():
    """The challenge token has type ``mfa``, a jti and the configured lifetime."""
    token = create_mfa_token(uuid.uuid4())

    claims = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

    assert claims["type"] == "mfa"
    assert claims["jti"]
    assert claims["exp"] - claims["iat"] == pytest.approx(
        settings.MFA_CHALLENGE_MINUTES * 60, abs=1
    )


@pytest.mark.asyncio
async def test_mfa_token_is_rejected_as_access_token(client: AsyncClient):
    """A challenge token grants no access through cookie or bearer."""
    await create_admin(client, "admin@test.com")
    await enroll("admin@test.com")
    await post_login(client, "admin@test.com")
    token = client.cookies["mfa_token"]

    bearer = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    cookie = await client.get("/users/me", headers={"Cookie": f"access_token={token}"})
    admin = await client.get(
        "/admin/users", headers={"Cookie": f"access_token={token}"}
    )

    assert bearer.status_code == 401
    assert cookie.status_code == 401
    assert admin.status_code == 401


@pytest.mark.asyncio
async def test_access_token_is_rejected_as_mfa_token(client: AsyncClient):
    """An access token cannot be presented as a challenge token."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    user_id = await get_user_id("admin@test.com")
    token = create_access_token(user_id)

    response = await client.post(
        "/auth/mfa/verify",
        json={"code": totp_code(secret)},
        headers={"Cookie": f"mfa_token={token}"},
    )

    assert response.status_code == 401
    assert response.json()["error"] == ErrorMessages.MFA_CHALLENGE_INVALID


# ---------------------------------------------------------------------------
# Enforcement
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_refresh_preserves_mfa_claim(client: AsyncClient):
    """Rotation carries the claim to both new tokens."""
    await open_admin_session(client, "admin@test.com")
    before = access_claims(client)["jti"]

    response = await client.post("/auth/refresh")

    assert response.status_code == 200
    claims = access_claims(client)
    assert claims["jti"] != before
    assert claims["mfa"] is True
    refresh = jwt.decode(
        client.cookies["refresh_token"], settings.SECRET_KEY, algorithms=["HS256"]
    )
    assert refresh["mfa"] is True
    assert (await client.get("/admin/users")).status_code == 200


@pytest.mark.asyncio
async def test_refresh_does_not_grant_the_mfa_claim(client: AsyncClient):
    """Rotating a session without the claim yields tokens without it."""
    await register_and_verify(client, "user@test.com")
    await login(client, "user@test.com")

    await client.post("/auth/refresh")

    assert "mfa" not in access_claims(client)
    await promote_to_admin("user@test.com")
    response = await client.get("/admin/users")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.MFA_REQUIRED


@pytest.mark.asyncio
async def test_promoted_user_without_mfa_claim_gets_403_on_admin_routes_only(
    client: AsyncClient,
):
    """A session from before a promotion keeps user routes but not admin ones."""
    await register_and_verify(client, "user@test.com")
    await login(client, "user@test.com")
    await promote_to_admin("user@test.com")
    await grant_permissions("user@test.com", [Permission.USERS_READ])

    admin = await client.get("/admin/users")
    me = await client.get("/users/me")

    assert admin.status_code == 403
    assert admin.json()["error"] == ErrorMessages.MFA_REQUIRED
    assert me.status_code == 200

    await promote_to_superadmin("user@test.com")
    superadmin = await client.get("/admin/admins")
    assert superadmin.status_code == 403
    assert superadmin.json()["error"] == ErrorMessages.MFA_REQUIRED
    assert (await client.get("/users/me")).status_code == 200


@pytest.mark.asyncio
async def test_plain_user_with_no_claim_still_gets_the_role_error(client: AsyncClient):
    """A non-admin is told about the missing role, not about MFA."""
    await register_and_verify(client, "user@test.com")
    await login(client, "user@test.com")

    response = await client.get("/admin/users")

    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS


def _stub_socket(token: str) -> SimpleNamespace:
    """Build a WebSocket stand-in carrying an access-token cookie."""
    return SimpleNamespace(cookies={"access_token": token}, close=AsyncMock())


@pytest.mark.asyncio
async def test_admin_socket_closes_without_mfa_claim(client: AsyncClient):
    """The admin feed refuses a session lacking the claim."""
    await register_and_verify(client, "user@test.com")
    await login(client, "user@test.com")
    await promote_to_admin("user@test.com")
    await grant_permissions("user@test.com", [Permission.SUPPORT_READ])
    websocket = _stub_socket(client.cookies["access_token"])

    with patch(
        "app.api.routes.admin.support.serve_multiplex", new=AsyncMock()
    ) as serve:
        async with TestingSessionLocal() as session:
            await admin_feed_ws(websocket, session)

    websocket.close.assert_awaited_once_with(code=1008)
    serve.assert_not_awaited()


@pytest.mark.asyncio
async def test_admin_socket_serves_a_session_with_mfa_claim(client: AsyncClient):
    """The admin feed accepts a claim-bearing session."""
    await open_admin_session(client, "admin@test.com")
    websocket = _stub_socket(client.cookies["access_token"])

    with patch(
        "app.api.routes.admin.support.serve_multiplex", new=AsyncMock()
    ) as serve:
        async with TestingSessionLocal() as session:
            await admin_feed_ws(websocket, session)

    websocket.close.assert_not_awaited()
    serve.assert_awaited_once()


@pytest.mark.asyncio
async def test_maintenance_gate_blocks_admin_without_mfa_claim(client: AsyncClient):
    """During maintenance only an admin holding the claim passes the gate."""
    await register_and_verify(client, "user@test.com")
    await login(client, "user@test.com")
    await promote_to_admin("user@test.com")
    await enable_maintenance()

    response = await client.get("/users/me")

    assert response.status_code == 503
    assert response.json()["error"] == ErrorMessages.MAINTENANCE_MODE


@pytest.mark.asyncio
async def test_admin_can_sign_in_with_mfa_during_maintenance(client: AsyncClient):
    """The MFA endpoints are exempt, otherwise admins would be locked out."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await enable_maintenance()
    await post_login(client, "admin@test.com")

    response = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    assert response.status_code == 200
    assert (await client.get("/users/me")).status_code == 200
    assert (await client.get("/admin/users")).status_code == 200


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mfa_reset_requires_permission_and_revokes_sessions(
    client: AsyncClient, other_client: AsyncClient
):
    """The grant is required; a reset drops the enrollment and every session."""
    await open_admin_session(client, "actor@test.com")
    await open_admin_session(other_client, "target@test.com")
    target_id = await get_user_id("target@test.com")

    denied = await client.post(f"/admin/users/{target_id}/mfa/reset")
    assert denied.status_code == 403
    assert denied.json()["error"] == ErrorMessages.INSUFFICIENT_PERMISSIONS
    assert await mfa_row("target@test.com") is not None
    assert (await other_client.get("/users/me")).status_code == 200

    # The target is an admin, so the reset also takes ``admins:write``.
    await grant_permissions(
        "actor@test.com", [Permission.USERS_MFA_RESET, Permission.ADMINS_WRITE]
    )
    response = await client.post(f"/admin/users/{target_id}/mfa/reset")

    assert response.status_code == 200
    assert response.json()["message"] == SuccessMessages.ADMIN_USER_MFA_RESET
    assert await mfa_row("target@test.com") is None
    async with TestingSessionLocal() as session:
        codes = (
            (
                await session.execute(
                    select(UserMfaRecoveryCode).where(
                        UserMfaRecoveryCode.user_id == uuid.UUID(target_id)
                    )
                )
            )
            .scalars()
            .all()
        )
    assert codes == []
    assert (await other_client.get("/users/me")).status_code == 401

    relogin = await post_login(client, "target@test.com")
    assert relogin.json()["enrollment_required"] is True

    rows = [
        r
        for r in await audit_rows()
        if r.details and r.details.get("action") == "admin_reset_user_mfa"
    ]
    assert len(rows) == 1
    assert str(rows[0].resource_id) == target_id
    assert "target@test.com" not in json.dumps(rows[0].details)


@pytest.mark.asyncio
async def test_mfa_reset_of_superadmin_is_refused_for_plain_admin(client: AsyncClient):
    """No grant lets a plain admin reset a superadmin."""
    await open_admin_session(client, "actor@test.com")
    await grant_permissions("actor@test.com", [Permission.USERS_MFA_RESET])
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com", root=True)
    await enroll("root@test.com")

    response = await client.post(
        f"/admin/users/{await get_user_id('root@test.com')}/mfa/reset"
    )

    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.ADMIN_CANNOT_MODIFY_SUPERADMIN
    assert await mfa_row("root@test.com") is not None


@pytest.mark.asyncio
async def test_mfa_reset_unknown_user_returns_404(client: AsyncClient):
    """Resetting an unknown account fails with 404."""
    await open_admin_session(client, "actor@test.com")
    await grant_permissions("actor@test.com", [Permission.USERS_MFA_RESET])

    response = await client.post(f"/admin/users/{uuid.uuid4()}/mfa/reset")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cli_resets_the_root_superadmin_and_audits(client: AsyncClient):
    """The last-resort command clears root's MFA, revokes sessions and logs it."""
    await register_and_verify(client, "root@test.com")
    await promote_to_superadmin("root@test.com", root=True)
    secret, _ = await enroll("root@test.com")
    await post_login(client, "root@test.com")
    await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})
    root_id = await get_user_id("root@test.com")

    with (
        patch.object(reset_mfa_cli, "AsyncSessionLocal", TestingSessionLocal),
        patch.object(reset_mfa_cli, "init_redis", new=AsyncMock()),
        patch.object(reset_mfa_cli, "close_redis", new=AsyncMock()),
    ):
        exit_code = await reset_mfa_cli.run("root@test.com")

    assert exit_code == 0
    assert await mfa_row("root@test.com") is None
    assert (await client.get("/users/me")).status_code == 401
    rows = [
        r
        for r in await audit_rows()
        if r.details and r.details.get("action") == "cli_reset_mfa"
    ]
    assert len(rows) == 1
    assert str(rows[0].resource_id) == root_id
    assert "root@test.com" not in json.dumps(rows[0].details)


@pytest.mark.asyncio
@pytest.mark.parametrize("email", ["other@test.com", "missing@test.com"])
async def test_cli_refuses_anyone_but_the_root_superadmin(
    client: AsyncClient, email: str
):
    """A non-root superadmin or an unknown account is left untouched."""
    await register_and_verify(client, "other@test.com")
    await promote_to_superadmin("other@test.com", root=False)
    await enroll("other@test.com")

    with (
        patch.object(reset_mfa_cli, "AsyncSessionLocal", TestingSessionLocal),
        patch.object(reset_mfa_cli, "init_redis", new=AsyncMock()),
        patch.object(reset_mfa_cli, "close_redis", new=AsyncMock()),
    ):
        exit_code = await reset_mfa_cli.run(email)

    assert exit_code == 1
    assert await mfa_row("other@test.com") is not None


# ---------------------------------------------------------------------------
# The session-opening responses carry the /users/me payload
# ---------------------------------------------------------------------------


def assert_lists_admin_keys(user: dict) -> None:
    """Assert a response's user holds the keys granted by ``create_admin``."""
    assert {Permission.USERS_READ.value, Permission.SUPPORT_READ.value} <= set(
        user["permissions"]
    )


@pytest.mark.asyncio
async def test_verify_response_lists_the_permissions_of_users_me(client: AsyncClient):
    """Finishing a login with a TOTP code returns the ``/users/me`` payload."""
    await create_admin(client, "admin@test.com")
    secret, _ = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")

    response = await client.post("/auth/mfa/verify", json={"code": totp_code(secret)})

    assert response.status_code == 200, response.text
    user = response.json()["user"]
    assert_lists_admin_keys(user)
    assert user == (await client.get("/users/me")).json()


@pytest.mark.asyncio
async def test_recovery_response_lists_the_permissions_of_users_me(
    client: AsyncClient,
):
    """Finishing a login with a recovery code returns the ``/users/me`` payload."""
    await create_admin(client, "admin@test.com")
    _, codes = await enroll("admin@test.com")
    await post_login(client, "admin@test.com")

    response = await client.post("/auth/mfa/recovery", json={"code": codes[0]})

    assert response.status_code == 200, response.text
    user = response.json()["user"]
    assert_lists_admin_keys(user)
    assert user == (await client.get("/users/me")).json()


@pytest.mark.asyncio
async def test_enroll_confirm_response_lists_the_permissions_of_users_me(
    client: AsyncClient,
):
    """Confirming an enrollment returns the ``/users/me`` payload."""
    await create_admin(client, "admin@test.com")
    await post_login(client, "admin@test.com")
    started = await client.post("/auth/mfa/enroll/start")

    response = await client.post(
        "/auth/mfa/enroll/confirm", json={"code": totp_code(started.json()["secret"])}
    )

    assert response.status_code == 200, response.text
    user = response.json()["user"]
    assert_lists_admin_keys(user)
    assert user == (await client.get("/users/me")).json()
