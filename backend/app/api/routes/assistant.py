"""AI assistant: chat stream relayed to Hermes, and conversation history."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentSessionId, SessionDep, require_user_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantConversationDetail,
    AssistantConversationList,
    AssistantKind,
)
from app.schemas.msg import Message
from app.services.assistant_service import (
    delete_conversation_service,
    get_conversation_service,
    list_conversations_service,
    start_chat_service,
)

router = APIRouter()

AssistantUser = Annotated[
    User, Depends(require_user_permission(Permission.SELF_ASSISTANT_USE))
]


@router.post("/chat")
async def chat(
    body: AssistantChatRequest,
    session: SessionDep,
    current_user: AssistantUser,
    session_id: CurrentSessionId,
) -> StreamingResponse:
    """Send a message and stream the assistant's reply as server-sent events."""
    stream = await start_chat_service(
        session, current_user, str(session_id) if session_id else None, body
    )
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        # nginx must not buffer the stream, or tokens arrive in one block.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/conversations", response_model=AssistantConversationList)
async def list_conversations(
    session: SessionDep,
    current_user: AssistantUser,
    kind: Annotated[AssistantKind, Query()] = "assistant",
) -> AssistantConversationList:
    """List the caller's conversations of one kind, latest first."""
    return await list_conversations_service(session, current_user, kind)


@router.get(
    "/conversations/{conversation_id}", response_model=AssistantConversationDetail
)
async def get_conversation(
    conversation_id: uuid.UUID, session: SessionDep, current_user: AssistantUser
) -> AssistantConversationDetail:
    """Return one of the caller's conversations with its messages."""
    return await get_conversation_service(session, current_user, conversation_id)


@router.delete("/conversations/{conversation_id}", response_model=Message)
async def delete_conversation(
    conversation_id: uuid.UUID, session: SessionDep, current_user: AssistantUser
) -> Message:
    """Delete one of the caller's conversations."""
    return await delete_conversation_service(session, current_user, conversation_id)
