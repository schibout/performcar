"""FastAPI lifespan: process-wide setup and teardown for shared resources."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.arq import close_arq_pool, init_arq_pool
from app.core.bootstrap import ensure_first_superadmin, ensure_system_rbac_catalog
from app.core.realtime import start_realtime, stop_realtime
from app.core.redis import close_redis, init_redis


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Initialise and dispose shared resources (Redis, realtime) for the API."""
    await init_redis()
    await init_arq_pool()
    await start_realtime()
    await ensure_system_rbac_catalog()
    await ensure_first_superadmin()
    try:
        yield
    finally:
        await stop_realtime()
        await close_arq_pool()
        await close_redis()
