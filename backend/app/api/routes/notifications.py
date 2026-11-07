import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, WebSocket

from app.api.deps import (
    SessionDep,
    get_ws_user,
    require_user_permission,
    user_has_permission,
)
from app.core.rate_limit import rate_limit_authenticated
from app.core.realtime import notifications_topic, serve_account_socket
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.notification import (
    NotificationListResponse,
    NotificationReadResponse,
    NotificationsMarkAllReadResponse,
    UnreadCountResponse,
)
from app.services.notification_service import (
    list_my_notifications_service,
    mark_all_read_service,
    mark_read_service,
    unread_count_service,
)
from app.use_cases.socket_permissions import permission_watcher

router = APIRouter()

# Same semantics as the support socket: auth fails before the handshake
# completes, so we refuse with 1008 (Policy Violation) without accepting.
_WS_POLICY_VIOLATION = 1008

NotificationReader = Annotated[
    User, Depends(require_user_permission(Permission.SELF_NOTIFICATIONS_READ))
]


@router.get("", response_model=NotificationListResponse)
async def list_my_notifications(
    _request: Request,
    session: SessionDep,
    current_user: NotificationReader,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    unread_only: Annotated[bool, Query()] = False,
) -> NotificationListResponse:
    """List the caller's notifications, newest first."""
    return await list_my_notifications_service(
        session=session,
        user=current_user,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    _request: Request,
    session: SessionDep,
    current_user: NotificationReader,
) -> UnreadCountResponse:
    """Return the caller's unread notification count (bell badge)."""
    return await unread_count_service(session=session, user=current_user)


@router.post("/read-all", response_model=NotificationsMarkAllReadResponse)
@rate_limit_authenticated("20/minute")
async def mark_all_notifications_read(
    request: Request,  # noqa: ARG001 - slowapi resolves the limit key by this name
    session: SessionDep,
    current_user: NotificationReader,
) -> NotificationsMarkAllReadResponse:
    """Mark every unread notification of the caller as read."""
    return await mark_all_read_service(session=session, user=current_user)


@router.post("/{notification_id}/read", response_model=NotificationReadResponse)
@rate_limit_authenticated("60/minute")
async def mark_notification_read(
    request: Request,  # noqa: ARG001 - slowapi resolves the limit key by this name
    session: SessionDep,
    current_user: NotificationReader,
    notification_id: uuid.UUID,
) -> NotificationReadResponse:
    """Mark one of the caller's notifications as read."""
    return await mark_read_service(
        session=session, user=current_user, notification_id=notification_id
    )


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, session: SessionDep) -> None:
    """Live notification feed for the authenticated user.

    Authenticates from the ``access_token`` cookie, requires
    ``self.notifications:read`` and subscribes the socket to the caller's
    ``notifications:{id}`` topic. The client sends nothing; new notifications
    arrive as ``NotificationRealtimeEvent`` frames. The socket closes if the
    caller loses the permission.
    """
    user = await get_ws_user(websocket, session)
    if user is None or not await user_has_permission(
        session, user, Permission.SELF_NOTIFICATIONS_READ
    ):
        await websocket.close(code=_WS_POLICY_VIOLATION)
        return

    await serve_account_socket(
        websocket,
        topic=notifications_topic(user.id),
        watcher=permission_watcher(user, Permission.SELF_NOTIFICATIONS_READ),
    )
