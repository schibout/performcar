"""FastAPI application entrypoint.

Heavy lifting lives in dedicated modules under ``app.core`` and
``app.api``; this file only wires them together so a reader can see the
whole composition at a glance.
"""

from fastapi import FastAPI

from app.api.exception_handlers import register_exception_handlers
from app.api.main import api_router
from app.api.middleware import register_maintenance_middleware
from app.core.config import settings
from app.core.lifespan import lifespan
from app.core.metrics import init_metrics
from app.core.middleware import register_middleware
from app.core.openapi import custom_generate_unique_id
from app.core.sentry import init_sentry
from app.core.telemetry import init_telemetry

init_sentry()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

register_exception_handlers(app)
register_middleware(app)
register_maintenance_middleware(app)
app.include_router(api_router, prefix=settings.API_V1_STR)

# OpenTelemetry tracing — no-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
init_telemetry(app)
# Prometheus instrumentation + gated /metrics endpoint.
init_metrics(app)
