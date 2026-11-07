"""OpenAPI schema customisations."""

from fastapi.routing import APIRoute


def custom_generate_unique_id(route: APIRoute) -> str:
    """Generate a stable operationId for OpenAPI clients.

    Falls back to the bare route name for routes without tags (e.g. the
    Prometheus /metrics endpoint registered by the instrumentator).
    """
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name
