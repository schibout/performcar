import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, WebSocket, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.core.messages.error_message import ErrorMessages
from app.core.mfa import admin_mfa_required
from app.core.security import decode_token_payload
from app.models.user import User
from app.repositories.token_blacklist import is_token_blacklisted
from app.repositories.user import get_user_by_id
from app.repositories.user_session import is_session_revoked
from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.token import TokenPayload
from app.schemas.user import SystemRole
from app.use_cases.permissions import user_has_permission

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Database session dependency."""
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    bearer_token: Annotated[str | None, Depends(reusable_oauth2)] = None,
) -> User:
    """Resolve the JWT to a User, allowing accounts in the deletion grace window.

    This intentionally does NOT reject ``is_active=False`` users — that check
    moved to ``get_current_active_user`` so deactivated users can still hit
    ``/users/me`` and ``/users/me/reactivate`` during the grace period.
    """
    token = request.cookies.get("access_token") or bearer_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorMessages.INVALID_TOKEN,
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        if await is_token_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ErrorMessages.INVALID_TOKEN,
                headers={"WWW-Authenticate": "Bearer"},
            )

        claims = decode_token_payload(token)
        if claims is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ErrorMessages.INVALID_TOKEN,
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Session guard: a token whose session was revoked (logout elsewhere,
        # admin kill, password change) dies here even though its signature and
        # expiry are still valid. Tokens without a sid (minted before the
        # session feature) pass — they expire within minutes on their own.
        sid = claims.get("sid")
        if sid and await is_session_revoked(sid):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ErrorMessages.INVALID_TOKEN,
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_data = TokenPayload(sub=claims["sub"], sid=sid, jti=claims.get("jti"))
        request.state.token_claims = claims
    except (ValidationError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorMessages.INVALID_TOKEN,
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_by_id(db, user_id=uuid.UUID(token_data.sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=ErrorMessages.USER_NOT_FOUND
        )
    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require the caller's account to be active (not in deletion grace)."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.USER_INACTIVE,
        )
    return current_user


def _has_required_mfa(user: User, claims: dict | None) -> bool:
    """Return whether the token's claims satisfy the MFA rule for the user's role."""
    return not admin_mfa_required(user.role) or bool(
        claims and claims.get("mfa") is True
    )


def _ensure_admin_mfa(request: Request, user: User) -> None:
    """Raise 403 if an admin's session has not proven a second factor."""
    claims = getattr(request.state, "token_claims", None)
    if not _has_required_mfa(user, claims):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.MFA_REQUIRED,
        )


def get_current_admin_user(
    request: Request,
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Require an active admin or superadmin — the admin-panel access gate.

    The session must also carry the ``mfa`` claim when MFA is enforced.
    """
    if current_user.role not in (SystemRole.ADMIN, SystemRole.SUPERADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.INSUFFICIENT_PERMISSIONS,
        )
    _ensure_admin_mfa(request, current_user)
    return current_user


def get_current_superadmin(
    request: Request,
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Require an active superadmin (the superadmin tier and root actions).

    The session must also carry the ``mfa`` claim when MFA is enforced.
    """
    if current_user.role != SystemRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.ONLY_SUPERADMIN_ALLOWED,
        )
    _ensure_admin_mfa(request, current_user)
    return current_user


async def _resolve_ws_identity(
    websocket: WebSocket, db: AsyncSession
) -> tuple[User, dict] | None:
    """Return the active user and token claims of a socket's cookie, if valid."""
    token = websocket.cookies.get("access_token")
    if not token:
        return None

    try:
        if await is_token_blacklisted(token):
            return None
        claims = decode_token_payload(token)
        if claims is None:
            return None
        sid = claims.get("sid")
        if sid and await is_session_revoked(sid):
            return None
        token_data = TokenPayload(sub=claims["sub"], sid=sid, jti=claims.get("jti"))
    except (ValidationError, ValueError):
        return None

    user = await get_user_by_id(db, user_id=uuid.UUID(token_data.sub))
    if user is None or not user.is_active:
        return None
    return user, claims


async def get_ws_user(websocket: WebSocket, db: AsyncSession) -> User | None:
    """Authenticate a WebSocket from its ``access_token`` cookie.

    Mirrors ``get_current_user`` but returns ``None`` instead of raising, so the
    caller can close the socket with an application code. Cookie-only: a browser
    sends the auth cookie on the WebSocket handshake automatically, while bearer
    headers are awkward to set on ``WebSocket`` clients.
    """
    identity = await _resolve_ws_identity(websocket, db)
    return identity[0] if identity else None


async def get_ws_admin_user(websocket: WebSocket, db: AsyncSession) -> User | None:
    """Authenticate an admin-only WebSocket, enforcing the ``mfa`` claim.

    Same contract as ``get_ws_user``. The role and permission checks stay with
    the caller; this only refuses an admin whose session lacks the second factor.
    """
    identity = await _resolve_ws_identity(websocket, db)
    if identity is None:
        return None
    user, claims = identity
    return user if _has_required_mfa(user, claims) else None


async def get_current_session_id(
    request: Request,
    bearer_token: Annotated[str | None, Depends(reusable_oauth2)] = None,
) -> uuid.UUID | None:
    """Resolve the ``sid`` claim of the caller's access token.

    Pure claim extraction — authentication itself is the job of
    ``get_current_user``, which the route must also depend on. Returns ``None``
    for legacy tokens minted before the session feature.
    """
    token = request.cookies.get("access_token") or bearer_token
    if not token:
        return None
    claims = decode_token_payload(token)
    sid = claims.get("sid") if claims else None
    if not sid:
        return None
    try:
        return uuid.UUID(sid)
    except ValueError:
        return None


# Type aliases for dependency injection
SessionDep = Annotated[AsyncSession, Depends(get_db)]
# reusable_oauth2 uses auto_error=False, so the dependency may resolve to None.
TokenDep = Annotated[str | None, Depends(reusable_oauth2)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
CurrentAdminUser = Annotated[User, Depends(get_current_admin_user)]
CurrentSuperAdmin = Annotated[User, Depends(get_current_superadmin)]
CurrentSessionId = Annotated[uuid.UUID | None, Depends(get_current_session_id)]


async def resolve_optional_user(request: Request, db: AsyncSession) -> User | None:
    """Resolve the JWT to a User if present and valid, else None (non-raising).

    A plain helper — NOT a FastAPI dependency — so the maintenance middleware can
    call it with a manually-opened session. It reads the token straight from the
    cookie or ``Authorization`` header rather than via ``OAuth2PasswordBearer``,
    which only resolves inside the HTTP dependency flow (and breaks on WebSocket
    routes). Mirrors ``get_ws_user`` for HTTP.
    """
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[len("Bearer ") :]
    if not token:
        return None
    try:
        if await is_token_blacklisted(token):
            return None
        claims = decode_token_payload(token)
        if claims is None:
            return None
        sid = claims.get("sid")
        if sid and await is_session_revoked(sid):
            return None
        token_data = TokenPayload(sub=claims["sub"], sid=sid, jti=claims.get("jti"))
    except (ValidationError, ValueError):
        return None
    user = await get_user_by_id(db, user_id=uuid.UUID(token_data.sub))
    # Mirror get_ws_user: a deactivated account (even with a still-valid token)
    # must not pass — otherwise a suspended/deactivated admin could slip through
    # the maintenance gate. The same goes for an admin without the second factor.
    if not user or not user.is_active or not _has_required_mfa(user, claims):
        return None
    return user


async def ensure_permission(
    session: AsyncSession, user: User, permission: Permission
) -> None:
    """Raise 403 unless ``user_has_permission`` accepts the account.

    Shared by the permission factories and the payload-aware authorization
    dependencies in the admin routes, so the raising form of the check lives in
    exactly one place.
    """
    if not await user_has_permission(session, user, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.INSUFFICIENT_PERMISSIONS,
        )


def require_permission(permission: Permission) -> Callable[..., Awaitable[User]]:
    """Build a dependency that enforces a single RBAC permission.

    The returned dependency inherits auth, active-account, and admin-role checks
    from ``CurrentAdminUser``. Superadmins bypass the lookup; plain admins must
    hold ``permission`` among their effective permissions or receive a 403.
    """

    async def _require(admin: CurrentAdminUser, session: SessionDep) -> User:
        """Enforce the captured permission for the resolved admin (superadmin bypasses)."""
        await ensure_permission(session, admin, permission)
        return admin

    _require.__rbac_permission__ = permission
    return _require


def require_any_permission(
    *permissions: Permission,
) -> Callable[..., Awaitable[User]]:
    """Build a dependency passing when the admin holds at least one permission.

    Same auth and admin-tier checks as ``require_permission``; superadmins pass
    through ``ensure_permission``. The refusal is the usual 403 when none is held.
    """
    if not permissions:
        raise ValueError("at least one permission is required")

    async def _require(admin: CurrentAdminUser, session: SessionDep) -> User:
        """Enforce that one of the captured permissions is held."""
        for permission in permissions:
            if await user_has_permission(session, admin, permission):
                return admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorMessages.INSUFFICIENT_PERMISSIONS,
        )

    _require.__rbac_permission__ = permissions
    return _require


def require_user_permission(permission: Permission) -> Callable[..., Awaitable[User]]:
    """Build a dependency enforcing a permission on any active account.

    Same check as ``require_permission``, resolved from the active user so a
    regular account can pass with a ``self.*`` key. It does not demand the admin
    tier, so it does not carry the admin-only MFA check either. That is why any
    other key is refused when the route is defined: an admin key behind this
    factory would skip the admin gate.
    """
    if not is_self_permission(permission):
        raise ValueError(f"{permission} is not a self-service (self.*) permission")

    async def _require(user: CurrentActiveUser, session: SessionDep) -> User:
        """Enforce the captured permission for the resolved active user."""
        await ensure_permission(session, user, permission)
        return user

    _require.__rbac_permission__ = permission
    return _require


async def _request_body_fields(request: Request) -> set[str]:
    """Return the top-level keys present in the request's JSON body.

    Authorization only needs to know which fields the caller is attempting to
    set, so a non-JSON or malformed body yields an empty set and the endpoint's
    own validation handles the error. Starlette caches the body, so reading it
    here does not consume it before the route parses the payload.
    """
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001 - any parse failure means "no fields seen"
        return set()
    return set(body) if isinstance(body, dict) else set()


def require_permissions(
    base: Permission,
    *,
    conditional: dict[str, Permission] | None = None,
) -> Callable[..., Awaitable[User]]:
    """Build a dependency enforcing ``base`` plus field-conditional permissions.

    ``base`` is always required. Each ``field -> permission`` in ``conditional``
    is additionally required when that field appears in the JSON request body —
    e.g. ``{"role": USERS_ROLE}`` demands ``users:role`` only when the update
    touches ``role``. Reading body keys instead of a typed model keeps the
    factory reusable across endpoints with different payload schemas.
    Superadmins bypass every check via ``ensure_permission``.
    """
    field_map = conditional or {}

    async def _require(
        request: Request, admin: CurrentAdminUser, session: SessionDep
    ) -> User:
        """Enforce ``base`` plus any field-conditional permissions present in the body."""
        await ensure_permission(session, admin, base)
        if field_map:
            present = await _request_body_fields(request)
            for field, permission in field_map.items():
                if field in present:
                    await ensure_permission(session, admin, permission)
        return admin

    _require.__rbac_permission__ = base
    return _require
