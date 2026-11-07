"""Tests for the /metrics endpoint and its environment-gated bearer-token guard."""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest_asyncio.fixture
async def root_client() -> AsyncClient:
    """Async client without the /api/v1 prefix — /metrics is mounted at root."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_metrics_open_in_local(root_client: AsyncClient) -> None:
    """Local environment exposes /metrics without authentication."""
    response = await root_client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    # Always-present default metric from prometheus_client
    assert "python_gc_objects_collected_total" in response.text


async def test_metrics_404_without_token_in_production(
    root_client: AsyncClient, monkeypatch: "pytest_asyncio.MonkeyPatch"
) -> None:
    """Production hides /metrics when METRICS_TOKEN is not configured."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", None)

    response = await root_client.get("/metrics")
    assert response.status_code == 404


async def test_metrics_404_with_wrong_token(
    root_client: AsyncClient, monkeypatch: "pytest_asyncio.MonkeyPatch"
) -> None:
    """Production rejects mismatched bearer tokens with a generic 404."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", "correct-secret")

    response = await root_client.get(
        "/metrics", headers={"Authorization": "Bearer wrong-secret"}
    )
    assert response.status_code == 404


async def test_metrics_200_with_correct_token(
    root_client: AsyncClient, monkeypatch: "pytest_asyncio.MonkeyPatch"
) -> None:
    """Production allows /metrics scraping when a matching bearer token is sent."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", "correct-secret")

    response = await root_client.get(
        "/metrics", headers={"Authorization": "Bearer correct-secret"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
