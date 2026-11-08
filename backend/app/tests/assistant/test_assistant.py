"""AI assistant: chat relay to Hermes, history, and conversation tickets."""

import json
import uuid

import httpx
import pytest

from app.core.config import settings
from app.repositories.assistant_ticket import issue_ticket, resolve_ticket
from app.services import assistant_service
from app.services.assistant_service import parse_hermes_event
from app.tests.assistant.conftest import (
    ClientFactory,
    make_admin_client,
    make_user_client,
)

SERVICE_KEY = "test-service-key"


@pytest.fixture
def hermes(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Configure the assistant and fake Hermes; return the captured requests."""
    monkeypatch.setattr(settings, "HERMES_API_KEY", "hermes-key")
    monkeypatch.setattr(settings, "ASSISTANT_SERVICE_KEY", SERVICE_KEY)
    captured: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        """Answer like the Hermes API: a tool event, two deltas, [DONE]."""
        captured.append({"url": str(request.url), "body": json.loads(request.content)})
        chunk = {"object": "chat.completion.chunk", "choices": [{"delta": {}}]}
        lines = [
            'event: hermes.tool.progress\ndata: {"tool": "catalogue_vehicules"}',
            "data: "
            + json.dumps({**chunk, "choices": [{"delta": {"content": "Bon"}}]}),
            "data: "
            + json.dumps({**chunk, "choices": [{"delta": {"content": "jour"}}]}),
            "data: [DONE]",
        ]
        return httpx.Response(200, text="\n\n".join(lines) + "\n\n")

    real_client = httpx.AsyncClient

    def fake_client(**kwargs):
        """Route the service's HTTP client to the fake Hermes."""
        return real_client(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", fake_client)
    return captured


def _events(text: str) -> list[dict]:
    """Decode the server-sent events of a response body."""
    return [
        json.loads(line[6:]) for line in text.splitlines() if line.startswith("data: ")
    ]


def test_parse_hermes_event() -> None:
    """Deltas and tool progress are translated; noise is skipped."""
    delta = json.dumps({"choices": [{"delta": {"content": "Salut"}}]})
    assert parse_hermes_event(None, delta) == {"type": "delta", "content": "Salut"}
    assert parse_hermes_event("hermes.tool.progress", '{"tool": "x"}') == {
        "type": "tool",
        "name": "x",
    }
    assert parse_hermes_event(None, '{"object": "hermes.tool.progress"}') == {
        "type": "tool",
        "name": "outil",
    }
    assert parse_hermes_event(None, json.dumps({"choices": [{"delta": {}}]})) is None
    assert parse_hermes_event(None, "not json") is None


@pytest.mark.asyncio
async def test_chat_streams_and_stores_history(
    client_factory: ClientFactory, hermes: list[dict]
) -> None:
    """A turn streams Hermes' reply, stores both messages and burns the ticket."""
    user = await make_user_client(client_factory, "seller@test.com")

    response = await user.post(
        "/assistant/chat", json={"message": "Bonjour", "page": "/fr/quotes"}
    )
    assert response.status_code == 200
    events = _events(response.text)
    assert events[0]["type"] == "conversation"
    assert {"type": "tool", "name": "catalogue_vehicules"} in events
    assert "".join(e["content"] for e in events if e["type"] == "delta") == "Bonjour"
    assert events[-1] == {"type": "done"}

    sent = hermes[0]
    assert sent["url"].endswith("/p/performcar/v1/chat/completions")
    system = sent["body"]["messages"][0]["content"]
    ticket = system.split("Ticket de conversation : ")[1].split("\n")[0]
    assert await resolve_ticket(ticket) is None  # revoked at the end of the turn

    conversation_id = events[0]["id"]
    listed = (await user.get("/assistant/conversations")).json()["data"]
    assert [c["id"] for c in listed] == [conversation_id]
    detail = (await user.get(f"/assistant/conversations/{conversation_id}")).json()
    assert [(m["role"], m["content"]) for m in detail["messages"]] == [
        ("user", "Bonjour"),
        ("assistant", "Bonjour"),
    ]

    # The next turn replays the stored history to the stateless API.
    await user.post(
        "/assistant/chat",
        json={"message": "Et ensuite ?", "conversation_id": conversation_id},
    )
    roles = [m["role"] for m in hermes[1]["body"]["messages"]]
    assert roles == ["system", "user", "assistant", "user"]


@pytest.mark.asyncio
@pytest.mark.usefixtures("hermes")
async def test_conversations_are_private(client_factory: ClientFactory) -> None:
    """Another account can neither read, continue nor delete a conversation."""
    owner = await make_user_client(client_factory, "owner@test.com")
    other = await make_user_client(client_factory, "other@test.com")
    events = _events((await owner.post("/assistant/chat", json={"message": "x"})).text)
    path = f"/assistant/conversations/{events[0]['id']}"

    assert (await other.get(path)).status_code == 404
    assert (await other.delete(path)).status_code == 404
    continued = await other.post(
        "/assistant/chat", json={"message": "y", "conversation_id": events[0]["id"]}
    )
    assert continued.status_code == 404
    assert (await owner.delete(path)).status_code == 200
    assert (await owner.get(path)).status_code == 404


@pytest.mark.asyncio
async def test_chat_requires_configuration(
    client_factory: ClientFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Without the Hermes key the chat answers 503 instead of failing mid-stream."""
    monkeypatch.setattr(settings, "HERMES_API_KEY", "")
    user = await make_user_client(client_factory, "seller@test.com")
    response = await user.post("/assistant/chat", json={"message": "Bonjour"})
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_ticket_acts_as_user_on_self_routes_only(
    client_factory: ClientFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ticket + service key resolve to the user; admin gates refuse them."""
    monkeypatch.setattr(settings, "ASSISTANT_SERVICE_KEY", SERVICE_KEY)
    user = await make_user_client(client_factory, "seller@test.com")
    user_id = uuid.UUID((await user.get("/users/me")).json()["id"])
    ticket = await issue_ticket(user_id, None)
    tool = await client_factory()

    good = {"X-Assistant-Ticket": ticket, "X-Assistant-Key": SERVICE_KEY}
    me = await tool.get("/users/me", headers=good)
    assert me.status_code == 200
    assert me.json()["email"] == "seller@test.com"

    wrong_key = {**good, "X-Assistant-Key": "nope"}
    assert (await tool.get("/users/me", headers=wrong_key)).status_code == 401
    unknown = {**good, "X-Assistant-Ticket": "unknown"}
    assert (await tool.get("/users/me", headers=unknown)).status_code == 401


@pytest.mark.asyncio
async def test_ticket_is_refused_by_admin_routes(
    client_factory: ClientFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Even an admin's ticket cannot reach /admin routes."""
    monkeypatch.setattr(settings, "ASSISTANT_SERVICE_KEY", SERVICE_KEY)
    admin = await make_admin_client(client_factory, "boss@test.com")
    admin_id = uuid.UUID((await admin.get("/users/me")).json()["id"])
    ticket = await issue_ticket(admin_id, None)
    tool = await client_factory()
    headers = {"X-Assistant-Ticket": ticket, "X-Assistant-Key": SERVICE_KEY}

    assert (await tool.get("/admin/users", headers=headers)).status_code == 403


@pytest.mark.asyncio
async def test_ticket_requires_a_configured_service_key(
    client_factory: ClientFactory,
) -> None:
    """With no service key configured, tickets are never accepted."""
    user = await make_user_client(client_factory, "seller@test.com")
    user_id = uuid.UUID((await user.get("/users/me")).json()["id"])
    ticket = await issue_ticket(user_id, None)
    tool = await client_factory()
    headers = {"X-Assistant-Ticket": ticket, "X-Assistant-Key": ""}
    assert (await tool.get("/users/me", headers=headers)).status_code == 401
