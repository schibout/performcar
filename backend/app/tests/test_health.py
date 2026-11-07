from unittest.mock import patch

import pytest
from httpx import AsyncClient
from redis.exceptions import RedisError


@pytest.mark.asyncio
async def test_liveness_returns_alive(client: AsyncClient):
    response = await client.get("/health/live")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "alive"
    assert isinstance(body["version"], str)


@pytest.mark.asyncio
async def test_readiness_returns_ready_when_dependencies_ok(client: AsyncClient):
    response = await client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"]["status"] == "ok"
    assert body["checks"]["redis"]["status"] == "ok"


@pytest.mark.asyncio
async def test_readiness_returns_503_when_redis_unavailable(
    client: AsyncClient, fake_redis
):
    with patch.object(fake_redis, "ping", side_effect=RedisError("boom")):
        response = await client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["redis"]["status"] == "unavailable"
    assert body["checks"]["database"]["status"] == "ok"


@pytest.mark.asyncio
async def test_readiness_reports_database_failure(client: AsyncClient):
    from sqlalchemy.exc import OperationalError

    with patch(
        "app.api.routes.health.text",
        side_effect=OperationalError("fail", {}, Exception("db down")),
    ):
        response = await client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["checks"]["database"]["status"] == "unavailable"
