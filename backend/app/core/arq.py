from __future__ import annotations

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import settings

_pool: ArqRedis | None = None


async def init_arq_pool() -> ArqRedis:
    """Initialize and return the shared arq enqueue pool."""
    global _pool
    if _pool is None:
        _pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _pool


async def close_arq_pool() -> None:
    """Close the shared arq enqueue pool."""
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None


def get_arq_pool() -> ArqRedis:
    """Return the shared arq enqueue pool. Raises if not initialized."""
    if _pool is None:
        raise RuntimeError("arq pool is not initialized")
    return _pool
