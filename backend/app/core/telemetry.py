"""OpenTelemetry trace exporter and auto-instrumentation setup.

Tracing is opt-in: when ``OTEL_EXPORTER_OTLP_ENDPOINT`` is unset, this
module is a no-op so local dev and tests have zero tracing overhead.

Once an endpoint is configured (Tempo, Jaeger, Honeycomb, an OTel
collector, etc.), every FastAPI request becomes a trace spanning the
matched route, all SQLAlchemy queries, every Redis call, and any
outbound httpx request — one waterfall view per request.

Example collector wiring::

    OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
    OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
    OTEL_SERVICE_NAME="fastapi-template"
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.core.config import settings

if TYPE_CHECKING:
    from fastapi import FastAPI


def init_telemetry(app: FastAPI) -> None:
    """Wire OTel exporters and auto-instrumentation onto the FastAPI app.

    No-op when ``OTEL_EXPORTER_OTLP_ENDPOINT`` is not set, so it is safe
    to call unconditionally from ``main.py``.
    """
    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return

    resource = Resource.create(
        {
            "service.name": os.getenv("OTEL_SERVICE_NAME") or settings.PROJECT_NAME,
            "deployment.environment": settings.ENVIRONMENT,
        }
    )
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)

    # Span name uses the route template (/users/{id}, not /users/42), so
    # cardinality stays bounded. /metrics and /health are excluded to keep
    # scrape and probe traffic out of the trace stream.
    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls=f"/metrics,{settings.API_V1_STR}/health",
    )
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()
