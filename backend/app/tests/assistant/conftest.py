"""Fixtures for the AI assistant tests (reuses the support client factory)."""

from app.tests.support.conftest import (  # noqa: F401 - re-exported fixture
    ClientFactory,
    client_factory,
    make_admin_client,
    make_user_client,
)

__all__ = ["ClientFactory", "make_admin_client", "make_user_client"]
