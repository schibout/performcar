from dataclasses import dataclass
from html import escape

from app.core.broadcast_templates import render_template
from app.core.config import settings
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementKind
from app.schemas.user import Language


@dataclass(frozen=True)
class BroadcastEmail:
    """A composed broadcast email, ready to hand to ``send_email``."""

    subject: str
    html: str
    text: str


def _content_for(
    announcement: Announcement, language: Language
) -> tuple[str, str] | None:
    """Resolve an announcement's (title, body) for one language, or ``None``.

    Templates are rendered from the catalog (datetime/text variables resolved);
    custom announcements read their stored per-language translations, falling
    back to the default language then any available one.
    """
    if announcement.kind == AnnouncementKind.TEMPLATE.value:
        rendered = render_template(
            announcement.template_key, language, announcement.variables
        )
        return (rendered.title, rendered.body) if rendered else None

    translations = announcement.translations or {}
    default = Language(settings.DEFAULT_LANGUAGE).value
    content = (
        translations.get(language.value)
        or translations.get(default)
        or next(iter(translations.values()), None)
    )
    if not content:
        return None
    return content.get("title", ""), content.get("body", "")


def build_broadcast_email(announcement: Announcement) -> BroadcastEmail:
    """Build an email carrying every language for one announcement.

    Each supported language gets its own section (default language first), so a
    single email is readable by every recipient regardless of their preference —
    no stored language preference required. The subject joins every language's
    title (e.g. "Scheduled Maintenance · Planlı Bakım").
    """
    default_lang = Language(settings.DEFAULT_LANGUAGE)
    languages = [default_lang] + [lang for lang in Language if lang != default_lang]

    titles: list[str] = []
    html_sections: list[str] = []
    text_sections: list[str] = []
    for language in languages:
        content = _content_for(announcement, language)
        if content is None:
            continue
        title, body = content
        if title not in titles:
            titles.append(title)
        html_sections.append(
            f'<tr><td style="padding:16px 0;">'
            f'<h2 style="margin:0 0 8px;font-size:18px;color:#111;">{escape(title)}</h2>'
            f'<p style="margin:0;font-size:14px;line-height:1.6;color:#444;">'
            f"{escape(body)}</p></td></tr>"
        )
        text_sections.append(f"{title}\n{body}")

    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">'
        + '<tr><td><hr style="border:none;border-top:1px solid #eee;"></td></tr>'.join(
            html_sections
        )
        + "</table>"
    )
    text = "\n\n— — —\n\n".join(text_sections)
    return BroadcastEmail(subject=" · ".join(titles), html=html, text=text)
