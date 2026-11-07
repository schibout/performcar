"""End-to-end tests for the admin /admin/broadcasts endpoints.

Covers composing template and custom announcements, the compose-time
validation guards, RBAC gating, the single-active-banner rule, the best-effort
email enqueue, and the paginated history listing. Each test drives the real
service stack (validation -> persist -> fan-out) through the ASGI client.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.notification import Notification
from app.schemas.notification import NotificationType
from app.tests.conftest import TestingSessionLocal


async def _notification_count() -> int:
    """Count persisted in-app notifications across all users."""
    async with TestingSessionLocal() as session:
        return (
            await session.execute(select(func.count()).select_from(Notification))
        ).scalar_one()


async def _announcement_notifications() -> list[Notification]:
    """Return every admin-announcement notification that was fanned out."""
    async with TestingSessionLocal() as session:
        result = await session.execute(
            select(Notification).where(
                Notification.type == NotificationType.ADMIN_ANNOUNCEMENT.value
            )
        )
        return list(result.scalars().all())


# --- Templates catalog ------------------------------------------------------


@pytest.mark.asyncio
async def test_template_catalog_lists_known_templates(admin_client: AsyncClient):
    """The compose catalog exposes every seeded template with its variables."""
    response = await admin_client.get("/admin/broadcast-templates")

    assert response.status_code == 200, response.text
    keys = {tpl["key"] for tpl in response.json()["templates"]}
    assert {"maintenance", "welcome", "new_feature", "security_notice"} <= keys

    maintenance = next(
        tpl for tpl in response.json()["templates"] if tpl["key"] == "maintenance"
    )
    var_names = {v["name"] for v in maintenance["variables"]}
    assert var_names == {"starts_at", "ends_at"}


# --- Create: happy paths ----------------------------------------------------


@pytest.mark.asyncio
async def test_create_template_broadcast_fans_out(admin_client: AsyncClient):
    """A template broadcast is created, returns the success key, and notifies."""
    payload = {
        "kind": "template",
        "template_key": "new_feature",
        "variables": {"feature": {"fr": "Mode sombre", "en": "Dark mode"}},
        "level": "info",
        "audience": "all",
    }

    response = await admin_client.post("/admin/broadcasts", json=payload)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["message"] == SuccessMessages.BROADCAST_SENT
    assert body["recipients"] >= 1
    assert body["announcement"]["kind"] == "template"
    assert body["announcement"]["template_key"] == "new_feature"

    notifications = await _announcement_notifications()
    assert len(notifications) == body["recipients"]
    # The stored payload carries everything the FE needs to render per-locale.
    sample = notifications[0]
    assert sample.data["template_key"] == "new_feature"
    assert sample.data["variables"]["feature"]["en"] == "Dark mode"


@pytest.mark.asyncio
async def test_create_custom_broadcast(admin_client: AsyncClient):
    """A custom announcement stores its per-language translations and fans out."""
    payload = {
        "kind": "custom",
        "translations": {
            "fr": {"title": "Bonjour", "body": "Corps de l'annonce personnalisée."},
            "en": {"title": "Hello", "body": "A custom announcement body."},
        },
        "level": "warning",
        "audience": "all",
    }

    response = await admin_client.post("/admin/broadcasts", json=payload)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["announcement"]["kind"] == "custom"
    assert body["announcement"]["translations"]["en"]["title"] == "Hello"

    notifications = await _announcement_notifications()
    assert notifications[0].data["translations"]["fr"]["title"] == "Bonjour"


# --- Create: validation guards ---------------------------------------------


@pytest.mark.asyncio
async def test_create_template_without_key_is_rejected(admin_client: AsyncClient):
    """A template broadcast missing its template_key fails schema validation."""
    response = await admin_client.post(
        "/admin/broadcasts",
        json={"kind": "template", "audience": "all"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_unknown_template_key_404(admin_client: AsyncClient):
    """A syntactically valid but unknown template key returns a keyed 404."""
    response = await admin_client.post(
        "/admin/broadcasts",
        json={"kind": "template", "template_key": "does_not_exist", "audience": "all"},
    )
    assert response.status_code == 404
    assert response.json()["error"] == ErrorMessages.ANNOUNCEMENT_TEMPLATE_NOT_FOUND


@pytest.mark.asyncio
async def test_create_custom_with_template_key_is_rejected(admin_client: AsyncClient):
    """Mixing a custom kind with a template_key is a content conflict (422)."""
    response = await admin_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "template_key": "welcome",
            "translations": {"en": {"title": "T", "body": "B"}},
            "audience": "all",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_custom_without_translations_is_rejected(
    admin_client: AsyncClient,
):
    """A custom announcement with no translations fails validation."""
    response = await admin_client.post(
        "/admin/broadcasts",
        json={"kind": "custom", "audience": "all"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_role_audience_without_role_is_rejected(
    admin_client: AsyncClient,
):
    """Audience=role requires a role_filter; omitting it fails validation."""
    response = await admin_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "T", "body": "B"}},
            "audience": "role",
        },
    )
    assert response.status_code == 422


# --- Single active banner ---------------------------------------------------


@pytest.mark.asyncio
async def test_new_banner_supersedes_previous(admin_client: AsyncClient):
    """Activating a second banner deactivates the first (single active banner)."""
    first = await admin_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "First", "body": "B"}},
            "audience": "all",
            "show_banner": True,
        },
    )
    assert first.status_code == 201, first.text

    second = await admin_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "Second", "body": "B"}},
            "audience": "all",
            "show_banner": True,
        },
    )
    assert second.status_code == 201, second.text

    active = await admin_client.get("/announcements/active")
    assert active.status_code == 200
    banner = active.json()["announcement"]
    assert banner is not None
    assert banner["id"] == second.json()["announcement"]["id"]
    assert banner["translations"]["en"]["title"] == "Second"


# --- Email channel ----------------------------------------------------------


@pytest.mark.asyncio
async def test_send_email_enqueues_job(admin_client: AsyncClient):
    """When send_email is set, the broadcast enqueues the email worker job."""
    pool = AsyncMock()
    with patch("app.services.admin.broadcast_service.get_arq_pool", return_value=pool):
        response = await admin_client.post(
            "/admin/broadcasts",
            json={
                "kind": "custom",
                "translations": {"en": {"title": "Mailed", "body": "B"}},
                "audience": "all",
                "send_email": True,
            },
        )

    assert response.status_code == 201, response.text
    announcement_id = response.json()["announcement"]["id"]
    pool.enqueue_job.assert_awaited_once_with("send_broadcast_emails", announcement_id)


@pytest.mark.asyncio
async def test_email_enqueue_failure_does_not_fail_request(admin_client: AsyncClient):
    """A queue hiccup is swallowed: in-app delivery already succeeded (201)."""
    with patch(
        "app.services.admin.broadcast_service.get_arq_pool",
        side_effect=RuntimeError("redis down"),
    ):
        response = await admin_client.post(
            "/admin/broadcasts",
            json={
                "kind": "custom",
                "translations": {"en": {"title": "Best effort", "body": "B"}},
                "audience": "all",
                "send_email": True,
            },
        )

    assert response.status_code == 201, response.text
    assert await _notification_count() >= 1


# --- RBAC -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_requires_authentication(client: AsyncClient):
    """Anonymous callers cannot compose a broadcast."""
    response = await client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "T", "body": "B"}},
            "audience": "all",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_forbidden_for_regular_user(regular_client: AsyncClient):
    """A user without the broadcast:write permission is refused (403)."""
    response = await regular_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "T", "body": "B"}},
            "audience": "all",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_forbidden_for_regular_user(regular_client: AsyncClient):
    """Listing history requires broadcast:read; a plain user is refused."""
    response = await regular_client.get("/admin/broadcasts")
    assert response.status_code == 403


# --- History listing --------------------------------------------------------


@pytest.mark.asyncio
async def test_history_lists_newest_first_with_pagination(admin_client: AsyncClient):
    """History returns sent announcements newest-first and honours skip/limit."""
    for index in range(3):
        response = await admin_client.post(
            "/admin/broadcasts",
            json={
                "kind": "custom",
                "translations": {"en": {"title": f"Item {index}", "body": "B"}},
                "audience": "all",
            },
        )
        assert response.status_code == 201, response.text

    full = await admin_client.get("/admin/broadcasts")
    assert full.status_code == 200
    body = full.json()
    assert body["total"] == 3
    assert body["data"][0]["translations"]["en"]["title"] == "Item 2"

    page = await admin_client.get("/admin/broadcasts", params={"skip": 0, "limit": 2})
    assert page.json()["limit"] == 2
    assert len(page.json()["data"]) == 2


@pytest.mark.asyncio
async def test_active_banner_absent_returns_null(admin_client: AsyncClient):
    """With no banner ever activated, the active endpoint reports null."""
    await admin_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "No banner", "body": "B"}},
            "audience": "all",
            "show_banner": False,
        },
    )

    active = await admin_client.get("/announcements/active")
    assert active.status_code == 200
    assert active.json()["announcement"] is None


@pytest.mark.asyncio
async def test_create_active_audience_targets_active_users(admin_client: AsyncClient):
    """Audience=active resolves to active accounts and still fans out."""
    response = await admin_client.post(
        "/admin/broadcasts",
        json={
            "kind": "custom",
            "translations": {"en": {"title": "Active only", "body": "B"}},
            "audience": "active",
        },
    )
    assert response.status_code == 201, response.text
    # The seeded admin is active, so at least one recipient is targeted.
    assert response.json()["recipients"] >= 1
