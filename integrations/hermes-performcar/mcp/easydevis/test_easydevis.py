"""Tests du client EasyDevis (transport HTTP simulé, aucun appel réseau)."""

import httpx
import pytest

from easydevis_client import EasyDevisClient, EasyDevisError, monthly_payment


def test_monthly_payment_matches_the_api_rule():
    assert monthly_payment(1450, 250, 12) == 100.0
    assert monthly_payment(1000, 0, 3) == 333.33
    assert monthly_payment(0.05, 0, 2) == 0.03  # demi-centime arrondi au-dessus


def _client(handler) -> EasyDevisClient:
    return EasyDevisClient(
        "http://api.test/api/v1", "assistant@test.fr", "secret", httpx.MockTransport(handler)
    )


async def test_logs_in_then_sends_the_bearer_token():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth/login"):
            return httpx.Response(200, json={}, headers={"set-cookie": "access_token=tok1; Path=/"})
        seen.append(request.headers["authorization"])
        return httpx.Response(200, json={"items": []})

    api = _client(handler)
    assert await api.request("GET", "/catalog/services") == {"items": []}
    assert seen == ["Bearer tok1"]


async def test_relogs_once_on_expired_token():
    logins = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth/login"):
            logins.append(1)
            return httpx.Response(
                200, json={}, headers={"set-cookie": f"access_token=tok{len(logins)}; Path=/"}
            )
        if request.headers["authorization"] == "Bearer tok1":
            return httpx.Response(401, json={"success": False, "error": "expired"})
        return httpx.Response(200, json={"ok": True})

    api = _client(handler)
    assert await api.request("GET", "/quotes") == {"ok": True}
    assert len(logins) == 2


async def test_api_errors_carry_the_error_key():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth/login"):
            return httpx.Response(200, json={}, headers={"set-cookie": "access_token=t; Path=/"})
        return httpx.Response(
            422, json={"success": False, "error": "error.quote.down_payment_too_high"}
        )

    api = _client(handler)
    with pytest.raises(EasyDevisError) as caught:
        await api.request("POST", "/quotes", json={})
    assert caught.value.status == 422
    assert caught.value.code == "error.quote.down_payment_too_high"


async def test_mfa_account_is_refused():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"enrollment_required": False})

    with pytest.raises(EasyDevisError) as caught:
        await _client(handler).request("GET", "/quotes")
    assert caught.value.code == "error.assistant.login_without_token"
