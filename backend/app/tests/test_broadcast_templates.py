"""Unit tests for the broadcast template catalog and email builder.

These exercise the pure rendering helpers with no DB or HTTP client: template
placeholder substitution, UTC datetime formatting, and the multilingual email
assembly (subject joining, per-language sections, fallback).
"""

import pytest

from app.core.broadcast_templates import (
    _format_datetime,
    get_template,
    render_template,
    template_exists,
)
from app.models.announcement import Announcement
from app.schemas.user import Language
from app.services.admin.broadcast_email import build_broadcast_email

# --- render_template --------------------------------------------------------


def test_render_template_unknown_key_returns_none():
    """An unknown template key renders to None rather than raising."""
    assert render_template("nope", Language.EN, {}) is None


def test_render_template_formats_datetime_variables():
    """Datetime placeholders are substituted with a UTC-labelled, formatted value."""
    rendered = render_template(
        "maintenance",
        Language.EN,
        {
            "starts_at": "2026-01-01T14:00:00Z",
            "ends_at": "2026-01-02T15:30:00Z",
        },
    )

    assert rendered is not None
    assert "{starts_at}" not in rendered.body
    assert "{ends_at}" not in rendered.body
    assert "UTC" in rendered.body
    assert "14:00" in rendered.body


def test_render_template_picks_text_variable_for_language():
    """A text placeholder resolves to the requested language's value."""
    variables = {"feature": {"fr": "Mode sombre", "en": "Dark mode"}}

    en = render_template("new_feature", Language.EN, variables)
    fr = render_template("new_feature", Language.FR, variables)

    assert en is not None and "Dark mode" in en.body
    assert fr is not None and "Mode sombre" in fr.body


def test_render_template_text_variable_falls_back_when_language_missing():
    """A text value missing the asked language falls back to the default (fr)."""
    rendered = render_template(
        "new_feature", Language.EN, {"feature": {"fr": "Uniquement en français"}}
    )

    assert rendered is not None
    assert "Uniquement en français" in rendered.body


def test_render_template_keeps_unknown_placeholder_intact():
    """A placeholder with no supplied value is left untouched (SafeDict)."""
    rendered = render_template(
        "maintenance", Language.EN, {"starts_at": "2026-01-01T14:00:00Z"}
    )

    assert rendered is not None
    # ends_at was not provided, so its marker survives the format pass.
    assert "{ends_at}" in rendered.body


def test_template_helpers_agree_on_existence():
    """``template_exists`` and ``get_template`` agree for known/unknown keys."""
    assert template_exists("welcome") is True
    assert get_template("welcome") is not None
    assert template_exists("ghost") is False
    assert get_template("ghost") is None


# --- _format_datetime -------------------------------------------------------


def test_format_datetime_renders_utc_label():
    """A valid ISO instant is formatted with a literal UTC label."""
    formatted = _format_datetime("2026-01-01T09:05:00Z", Language.EN)
    assert "UTC" in formatted
    assert "09:05" in formatted


def test_format_datetime_passthrough_on_invalid():
    """A non-ISO string is returned unchanged rather than raising."""
    assert _format_datetime("not-a-date", Language.EN) == "not-a-date"


# --- build_broadcast_email --------------------------------------------------


def _custom(translations: dict) -> Announcement:
    """Build an in-memory custom announcement for the email builder."""
    return Announcement(
        kind="custom",
        template_key=None,
        variables={},
        translations=translations,
        level="info",
        audience="all",
        role_filter=None,
        show_banner=False,
        send_email=True,
        created_by=None,
    )


def test_build_email_joins_every_language_title_in_subject():
    """The subject concatenates each language's title with a separator."""
    announcement = _custom(
        {
            "en": {"title": "Scheduled Maintenance", "body": "EN body"},
            "fr": {"title": "Maintenance programmée", "body": "Corps FR"},
        }
    )

    email = build_broadcast_email(announcement)

    assert "Scheduled Maintenance" in email.subject
    assert "Maintenance programmée" in email.subject
    assert " · " in email.subject
    # Both language sections land in the rendered body.
    assert "EN body" in email.html
    assert "Corps FR" in email.text


def test_build_email_default_language_section_comes_first():
    """The default language (fr) leads the subject and body ordering."""
    announcement = _custom(
        {
            "en": {"title": "EN Title", "body": "EN"},
            "fr": {"title": "FR Title", "body": "FR"},
        }
    )

    email = build_broadcast_email(announcement)

    assert email.subject.startswith("FR Title")
    assert email.text.index("FR") < email.text.index("EN")


def test_build_email_renders_template_announcement():
    """A template announcement is rendered from the catalog for the email."""
    announcement = Announcement(
        kind="template",
        template_key="welcome",
        variables={},
        translations={},
        level="info",
        audience="all",
        role_filter=None,
        show_banner=False,
        send_email=True,
        created_by=None,
    )

    email = build_broadcast_email(announcement)

    assert "Welcome" in email.subject


def test_build_email_escapes_html_in_custom_content():
    """User-authored content is HTML-escaped in the email body."""
    announcement = _custom({"en": {"title": "<script>", "body": "<b>hi</b>"}})

    email = build_broadcast_email(announcement)

    assert "<script>" not in email.html
    assert "&lt;script&gt;" in email.html


@pytest.mark.parametrize("language", list(Language))
def test_render_welcome_for_every_language(language: Language):
    """The no-variable welcome template renders for every supported language."""
    rendered = render_template("welcome", language, {})
    assert rendered is not None
    assert rendered.title
    assert rendered.body
