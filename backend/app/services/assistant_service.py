"""AI assistant: conversation history and the streamed relay to Hermes Agent."""

import json
import logging
import uuid
from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.core.config import settings
from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.user import User
from app.repositories.assistant import (
    add_message,
    create_conversation,
    delete_conversation,
    get_user_conversation,
    list_messages,
    list_user_conversations,
)
from app.repositories.assistant_ticket import issue_ticket, revoke_ticket
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantConversationDetail,
    AssistantConversationList,
    AssistantConversationSummary,
)
from app.schemas.msg import Message

logger = logging.getLogger(__name__)

# Messages replayed to Hermes from the stored history (the API is stateless).
_HISTORY_LIMIT = 30

_NAVIGATION = """\
Pages de l'application (préfixe de langue /{locale}) :
- /{locale}/dashboard : tableau de bord
- /{locale}/quotes : mes devis ; /{locale}/quotes/new : nouveau devis ; \
/{locale}/quotes/history : historique ; /{locale}/quotes/<id> : détail d'un devis
- /{locale}/customers : clients de la concession
- /{locale}/dealership : ma concession
- /{locale}/assistant : assistant plein écran ; \
/{locale}/assistant/communication : rédaction de messages clients
- /{locale}/notifications, /{locale}/profile, /{locale}/support : notifications, profil, support
Administration (/{locale}/admin/...) : dashboard, quotes, customers, catalog, \
dealerships, users, roles, permission-sets, support, system-settings, assistant, \
assistant/communication, profile, notifications. Les rôles admin et superadmin \
n'ont accès qu'aux pages /{locale}/admin/... : ne leur donne que ces liens."""

_KIND_RULES = {
    "assistant": (
        "Tu aides l'utilisateur à naviguer dans EasyDevis, tu conseilles sur les "
        "offres PERFORM'CAR et tu prépares des devis avec les outils EasyDevis."
    ),
    "communication": (
        "Tu rédiges des messages destinés aux clients (email ou SMS) à partir des "
        "devis EasyDevis. Consulte le devis avec les outils avant d'écrire. Donne "
        "le message prêt à copier ; pour un email, commence par une ligne "
        "« Objet : ». L'utilisateur l'envoie lui-même : n'affirme jamais l'avoir envoyé."
    ),
}


def _sse(payload: dict) -> bytes:
    """Encode one server-sent event for the browser."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode()


def _title_from(message: str) -> str:
    """Build a conversation title from its first message."""
    line = " ".join(message.split())
    return line if len(line) <= 80 else f"{line[:77]}..."


def _locale_of(page: str | None) -> str:
    """Return the locale segment of the current page, French by default."""
    if page and page.startswith("/en"):
        return "en"
    return "fr"


def build_system_prompt(user: User, kind: str, page: str | None, ticket: str) -> str:
    """Instructions sent ahead of the conversation for this turn."""
    locale = _locale_of(page)
    name = " ".join(filter(None, [user.first_name, user.last_name])) or user.email
    return "\n\n".join(
        [
            "Tu es l'assistant IA intégré à PerformCar EasyDevis, l'application de "
            "devis du réseau PERFORM'CAR. Réponds en français (en anglais si "
            "l'utilisateur écrit en anglais), de façon concise.",
            _KIND_RULES[kind],
            f"Utilisateur connecté : {name} ({user.email}), rôle {user.role}. "
            f"Page affichée : {page or 'inconnue'}.",
            f"Ticket de conversation : {ticket}\n"
            "Passe ce ticket tel quel dans le paramètre `ticket` de CHAQUE outil "
            "EasyDevis : les outils agissent alors au nom de cet utilisateur, avec "
            "ses droits et sa concession. Ne révèle jamais le ticket.",
            "Avant toute création ou modification (devis, statut), présente un "
            "récapitulatif et attends la confirmation explicite de l'utilisateur.",
            "Pour guider l'utilisateur, donne des liens Markdown relatifs, par "
            f"exemple [Nouveau devis](/{locale}/quotes/new).\n"
            + _NAVIGATION.format(locale=locale),
        ]
    )


def parse_hermes_event(event: str | None, data: str) -> dict | None:
    """Translate one Hermes SSE event into a browser event (None to skip it)."""
    try:
        parsed = json.loads(data)
    except ValueError:
        return None
    if not isinstance(parsed, dict):
        return None
    if (
        event == "hermes.tool.progress"
        or parsed.get("object") == "hermes.tool.progress"
    ):
        name = parsed.get("tool") or parsed.get("message") or "outil"
        return {"type": "tool", "name": str(name)}
    content = "".join(
        (choice.get("delta") or {}).get("content") or ""
        for choice in parsed.get("choices") or []
        if isinstance(choice, dict)
    )
    return {"type": "delta", "content": content} if content else None


async def list_conversations_service(
    session: AsyncSession, user: User, kind: str
) -> AssistantConversationList:
    """List the caller's conversations of one kind."""
    rows = await list_user_conversations(session, user.id, kind)
    return AssistantConversationList(
        data=[AssistantConversationSummary.model_validate(row) for row in rows]
    )


async def _owned_conversation(
    session: AsyncSession, user: User, conversation_id: uuid.UUID, **kwargs: bool
):
    """Return the caller's conversation or raise 404."""
    conversation = await get_user_conversation(
        session, conversation_id, user.id, **kwargs
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.ASSISTANT_CONVERSATION_NOT_FOUND,
        )
    return conversation


async def get_conversation_service(
    session: AsyncSession, user: User, conversation_id: uuid.UUID
) -> AssistantConversationDetail:
    """Return one of the caller's conversations with its messages."""
    conversation = await _owned_conversation(
        session, user, conversation_id, with_messages=True
    )
    return AssistantConversationDetail.model_validate(conversation)


async def delete_conversation_service(
    session: AsyncSession, user: User, conversation_id: uuid.UUID
) -> Message:
    """Delete one of the caller's conversations."""
    conversation = await _owned_conversation(session, user, conversation_id)
    await delete_conversation(session, conversation)
    return Message(success=True, message=SuccessMessages.ASSISTANT_CONVERSATION_DELETED)


async def start_chat_service(
    session: AsyncSession,
    user: User,
    session_id: str | None,
    body: AssistantChatRequest,
) -> AsyncIterator[bytes]:
    """Store the user's message and return the event stream of the reply."""
    if not settings.HERMES_API_KEY or not settings.ASSISTANT_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorMessages.ASSISTANT_NOT_CONFIGURED,
        )
    if body.conversation_id is None:
        conversation = await create_conversation(
            session, user.id, body.kind, _title_from(body.message)
        )
    else:
        conversation = await _owned_conversation(session, user, body.conversation_id)

    history = list(await list_messages(session, conversation.id))[-_HISTORY_LIMIT:]
    await add_message(session, conversation.id, "user", body.message)
    ticket = await issue_ticket(user.id, session_id)
    messages = [
        {
            "role": "system",
            "content": build_system_prompt(user, conversation.kind, body.page, ticket),
        },
        *({"role": m.role, "content": m.content} for m in history),
        {"role": "user", "content": body.message},
    ]
    # The request's session is closed by the time the stream ends: store the
    # reply through a fresh session on the same engine.
    return _relay(
        session.bind, conversation.id, conversation.title, user.id, ticket, messages
    )


async def _relay(
    bind: AsyncEngine,
    conversation_id: uuid.UUID,
    title: str,
    user_id: uuid.UUID,
    ticket: str,
    messages: list[dict],
) -> AsyncIterator[bytes]:
    """Stream Hermes' answer to the browser, then store it."""
    yield _sse({"type": "conversation", "id": str(conversation_id), "title": title})
    url = (
        f"{settings.HERMES_API_URL.rstrip('/')}/p/{settings.HERMES_PROFILE}"
        "/v1/chat/completions"
    )
    headers = {
        "Authorization": f"Bearer {settings.HERMES_API_KEY}",
        # Separate long-term Hermes memory per EasyDevis account.
        "X-Hermes-Session-Key": f"easydevis-{user_id}",
    }
    payload = {"model": settings.HERMES_MODEL, "messages": messages, "stream": True}
    timeout = httpx.Timeout(10.0, read=float(settings.HERMES_TIMEOUT_SECONDS))
    parts: list[str] = []
    try:
        async with (
            httpx.AsyncClient(timeout=timeout) as client,
            client.stream("POST", url, json=payload, headers=headers) as response,
        ):
            if response.status_code != status.HTTP_200_OK:
                logger.error("Hermes answered HTTP %s", response.status_code)
                yield _sse(
                    {"type": "error", "code": ErrorMessages.ASSISTANT_UNAVAILABLE}
                )
                return
            event: str | None = None
            async for line in response.aiter_lines():
                if not line:
                    event = None
                elif line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    parsed = parse_hermes_event(event, data)
                    if parsed is None:
                        continue
                    if parsed["type"] == "delta":
                        parts.append(parsed["content"])
                    yield _sse(parsed)
    except httpx.HTTPError:
        logger.exception("Hermes stream failed")
        yield _sse({"type": "error", "code": ErrorMessages.ASSISTANT_UNAVAILABLE})
    finally:
        await _finish_turn(bind, conversation_id, ticket, "".join(parts))
    yield _sse({"type": "done"})


async def _finish_turn(
    bind: AsyncEngine, conversation_id: uuid.UUID, ticket: str, reply: str
) -> None:
    """Revoke the turn's ticket and store the (possibly partial) reply."""
    try:
        await revoke_ticket(ticket)
        if reply.strip():
            async with AsyncSession(bind, expire_on_commit=False) as session:
                await add_message(session, conversation_id, "assistant", reply)
    except Exception:
        logger.exception("Could not close assistant turn %s", conversation_id)
