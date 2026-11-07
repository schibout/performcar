"""Sentry error-tracking init.

Sentry is opt-in: it only initialises when ``SENTRY_DSN`` is set *and*
``ENVIRONMENT`` is not ``local``. That keeps developer machines and the
test suite from polluting the project's Sentry quota with noise.
"""

import sentry_sdk

from app.core.config import settings


def init_sentry() -> None:
    """Initialise Sentry if a DSN is configured and we are not running locally."""
    if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
        sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)
