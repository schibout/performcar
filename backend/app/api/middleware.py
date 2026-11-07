"""Maintenance-mode HTTP middleware.

Lives in the ``api`` layer (not ``core``) because it depends on auth/session
helpers (``resolve_optional_user``, ``get_db``); having ``core`` import from
``api`` would invert the layered dependency direction.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.deps import get_db, resolve_optional_user
from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.schemas.user import SystemRole
from app.use_cases.settings import get_bool

# API paths that stay reachable while maintenance mode is on, so admins can
# still authenticate and the frontend can render the maintenance screen.
_MAINTENANCE_EXEMPT: tuple[str, ...] = (
    f"{settings.API_V1_STR}/health",
    f"{settings.API_V1_STR}/auth/login",
    f"{settings.API_V1_STR}/auth/mfa",
    f"{settings.API_V1_STR}/auth/refresh",
    f"{settings.API_V1_STR}/auth/logout",
    f"{settings.API_V1_STR}/settings/public",
)


def register_maintenance_middleware(app: FastAPI) -> None:
    """Return 503 for non-admins while maintenance mode is on.

    Only API paths are gated. Auth (login/MFA/refresh/logout), health, and the
    public settings endpoint stay open so admins can sign in and the frontend
    can render the maintenance screen; admins and superadmins pass through.
    CORS preflight (OPTIONS) is never gated. Runs as HTTP middleware rather than
    a router dependency so WebSocket routes are untouched.
    """

    @app.middleware("http")
    async def maintenance_mode_middleware(request: Request, call_next):
        """Block non-admins with 503 while maintenance mode is on."""
        path = request.url.path
        if (
            request.method == "OPTIONS"
            or not path.startswith(settings.API_V1_STR)
            or path.startswith(_MAINTENANCE_EXEMPT)
        ):
            return await call_next(request)

        # Resolve the session through ``get_db`` honouring ``dependency_overrides``
        # so tests reuse their loop-bound session; production gets the real one.
        # The session is closed before ``call_next`` so the connection is not held
        # for the downstream request.
        db_factory = request.app.dependency_overrides.get(get_db, get_db)
        agen = db_factory()
        session = await agen.__anext__()
        try:
            maintenance_on = await get_bool(session, "maintenance_mode")
            user = (
                await resolve_optional_user(request, session)
                if maintenance_on
                else None
            )
        finally:
            await agen.aclose()

        if not maintenance_on:
            return await call_next(request)
        if user and user.role in (SystemRole.ADMIN, SystemRole.SUPERADMIN):
            return await call_next(request)
        return JSONResponse(
            status_code=503,
            content={"success": False, "error": ErrorMessages.MAINTENANCE_MODE},
        )
