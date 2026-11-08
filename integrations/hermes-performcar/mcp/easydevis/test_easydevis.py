"""Tests du client EasyDevis (transport HTTP simulé, aucun appel réseau)."""

import httpx
import pytest

from easydevis_client import EasyDevisClient, EasyDevisError, monthly_payment


def test_monthly_payment_matches_the_api_rule():
    assert monthly_payment(1450, 250, 12) == 100.0
    assert monthly_payment(1000, 0, 3) == 333.33
    assert monthly_payment(0.05, 0, 2) == 0.03  # demi-centime arrondi au-dessus


def _client(handler) -> EasyDevisClient:
    return EasyDevisClient("http://api.test/api/v1", "service-key", httpx.MockTransport(handler))


async def test_sends_the_ticket_and_the_service_key():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append((request.headers["x-assistant-ticket"], request.headers["x-assistant-key"]))
        return httpx.Response(200, json={"items": []})

    api = _client(handler)
    assert await api.request("GET", "/catalog/services", "tkt") == {"items": []}
    assert seen == [("tkt", "service-key")]


async def test_missing_ticket_is_refused_without_calling_the_api():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("no call expected")

    with pytest.raises(EasyDevisError) as caught:
        await _client(handler).request("GET", "/quotes", "")
    assert caught.value.code == "error.assistant.ticket_missing"


async def test_api_errors_carry_the_error_key():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            422, json={"success": False, "error": "error.quote.down_payment_too_high"}
        )

    api = _client(handler)
    with pytest.raises(EasyDevisError) as caught:
        await api.request("POST", "/quotes", "tkt", json={})
    assert caught.value.status == 422
    assert caught.value.code == "error.quote.down_payment_too_high"


def test_setting_falls_back_to_the_profile_env(tmp_path, monkeypatch):
    import server

    env = tmp_path / ".env"
    env.write_text('EASYDEVIS_SERVICE_KEY="from-file"\nOTHER=x\n', encoding="utf-8")
    monkeypatch.setattr(server, "PROFILE_ENV", env)
    monkeypatch.setenv("EASYDEVIS_SERVICE_KEY", "${EASYDEVIS_SERVICE_KEY}")
    assert server.setting("EASYDEVIS_SERVICE_KEY") == "from-file"
    monkeypatch.setenv("EASYDEVIS_SERVICE_KEY", "from-env")
    assert server.setting("EASYDEVIS_SERVICE_KEY") == "from-env"
    assert server.setting("MISSING", "d") == "d"
