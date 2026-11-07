from fastapi import APIRouter, Request

from app.api.deps import SessionDep
from app.core.rate_limit import rate_limit_public
from app.schemas.system_settings import PublicSettingsResponse
from app.services.system_settings_service import get_public_settings_service

router = APIRouter()


@router.get("/public", response_model=PublicSettingsResponse)
@rate_limit_public("60/minute")
async def read_public_settings(
    request: Request,  # noqa: ARG001 - required in the signature by slowapi
    session: SessionDep,
) -> PublicSettingsResponse:
    """Return public system settings for unauthenticated clients.

    Powers the login screen and maintenance gate before authentication: only
    settings flagged ``is_public`` in the registry are exposed here.
    """
    return await get_public_settings_service(session)
