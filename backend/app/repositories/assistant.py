import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assistant import AssistantConversation, AssistantMessage
from app.utils import utc_now


async def get_user_conversation(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    with_messages: bool = False,
) -> AssistantConversation | None:
    """Return one of the user's conversations, or None if it is not theirs."""
    stmt = select(AssistantConversation).where(
        AssistantConversation.id == conversation_id,
        AssistantConversation.user_id == user_id,
    )
    if with_messages:
        stmt = stmt.options(selectinload(AssistantConversation.messages))
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_user_conversations(
    session: AsyncSession, user_id: uuid.UUID, kind: str, limit: int = 50
) -> Sequence[AssistantConversation]:
    """Return the user's conversations of one kind, latest activity first."""
    stmt = (
        select(AssistantConversation)
        .where(
            AssistantConversation.user_id == user_id,
            AssistantConversation.kind == kind,
        )
        .order_by(AssistantConversation.updated_at.desc())
        .limit(limit)
    )
    return (await session.execute(stmt)).scalars().all()


async def create_conversation(
    session: AsyncSession, user_id: uuid.UUID, kind: str, title: str
) -> AssistantConversation:
    """Persist a new empty conversation."""
    conversation = AssistantConversation(user_id=user_id, kind=kind, title=title)
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


async def list_messages(
    session: AsyncSession, conversation_id: uuid.UUID
) -> Sequence[AssistantMessage]:
    """Return a conversation's messages in order."""
    stmt = (
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation_id)
        .order_by(AssistantMessage.created_at)
    )
    return (await session.execute(stmt)).scalars().all()


async def add_message(
    session: AsyncSession, conversation_id: uuid.UUID, role: str, content: str
) -> None:
    """Append a message and bump the conversation's activity time."""
    session.add(
        AssistantMessage(conversation_id=conversation_id, role=role, content=content)
    )
    conversation = await session.get(AssistantConversation, conversation_id)
    if conversation is not None:
        conversation.updated_at = utc_now()
    await session.commit()


async def delete_conversation(
    session: AsyncSession, conversation: AssistantConversation
) -> None:
    """Delete a conversation and its messages."""
    await session.delete(conversation)
    await session.commit()
