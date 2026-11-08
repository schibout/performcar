import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AssistantKind = Literal["assistant", "communication"]


class AssistantChatRequest(BaseModel):
    """One user message sent to the assistant."""

    conversation_id: uuid.UUID | None = None
    message: str = Field(min_length=1, max_length=8000)
    kind: AssistantKind = "assistant"
    # Current page path, so the assistant can guide navigation from there.
    page: str | None = Field(default=None, max_length=300)


class AssistantConversationSummary(BaseModel):
    """A conversation as listed in the history sidebar."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    kind: AssistantKind
    created_at: datetime
    updated_at: datetime


class AssistantConversationList(BaseModel):
    """The caller's conversations, latest activity first."""

    data: list[AssistantConversationSummary]


class AssistantMessageRead(BaseModel):
    """One stored message."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class AssistantConversationDetail(AssistantConversationSummary):
    """A conversation with its messages."""

    messages: list[AssistantMessageRead]
