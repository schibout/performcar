"""Tests for the user-facing GET /announcements/active endpoint.

The banner endpoint backs the in-app top banner: it requires an authenticated
active user and returns the single most-recent banner announcement (or null).
Banners are seeded straight through the repository so the test exercises the
same read path production uses.
"""

import pytest
from httpx import AsyncClient

from app.models.announcement import Announcement
from app.repositories.announcement import (
    create_announcement,
    deactivate_other_banners,
)
from app.tests.admin.conftest import login, register_and_verify
from app.tests.conftest import TestingSessionLocal


async def _seed_banner(title: str, *, show_banner: bool = True) -> Announcement:
    """Persist a custom banner announcement and make it the active one."""
    async with TestingSessionLocal() as session:
        announcement = await create_announcement(
            session,
            Announcement(
                kind="custom",
                template_key=None,
                variables={},
                translations={"en": {"title": title, "body": "Body."}},
                level="info",
                audience="all",
                role_filter=None,
                show_banner=show_banner,
                send_email=False,
                created_by=None,
            ),
        )
        if show_banner:
            await deactivate_other_banners(session, keep_id=announcement.id)
        return announcement


@pytest.mark.asyncio
async def test_active_requires_authentication(client: AsyncClient):
    """Anonymous callers cannot read the active banner."""
    response = await client.get("/announcements/active")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_active_returns_null_when_no_banner(client: AsyncClient):
    """An authenticated user sees null when no banner is active."""
    await register_and_verify(client, "viewer@test.com")
    await login(client, "viewer@test.com")

    response = await client.get("/announcements/active")

    assert response.status_code == 200
    assert response.json() == {"announcement": None}


@pytest.mark.asyncio
async def test_active_returns_the_current_banner(client: AsyncClient):
    """The endpoint surfaces the active banner's content to the viewer."""
    await register_and_verify(client, "viewer@test.com")
    await login(client, "viewer@test.com")
    seeded = await _seed_banner("Heads up")

    response = await client.get("/announcements/active")

    assert response.status_code == 200
    banner = response.json()["announcement"]
    assert banner is not None
    assert banner["id"] == str(seeded.id)
    assert banner["translations"]["en"]["title"] == "Heads up"


@pytest.mark.asyncio
async def test_active_ignores_non_banner_announcements(client: AsyncClient):
    """An announcement sent without show_banner never appears as the banner."""
    await register_and_verify(client, "viewer@test.com")
    await login(client, "viewer@test.com")
    await _seed_banner("Silent", show_banner=False)

    response = await client.get("/announcements/active")

    assert response.status_code == 200
    assert response.json()["announcement"] is None
