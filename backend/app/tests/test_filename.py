import re

import pytest

from app.utils import prefixed_filename, sanitize_filename


def test_none_passes_through() -> None:
    """None stays None so the optional column remains optional."""
    assert sanitize_filename(None) is None


def test_plain_name_is_preserved() -> None:
    """A clean, readable name survives untouched."""
    assert sanitize_filename("holiday-photo (1).png") == "holiday-photo (1).png"


@pytest.mark.parametrize(
    "raw",
    [
        "../../etc/passwd",
        "..\\..\\windows\\system32\\config",
        "/var/www/../secret.txt",
    ],
)
def test_path_components_are_stripped(raw: str) -> None:
    """Directory parts and traversal markers never reach the stored name."""
    result = sanitize_filename(raw)
    assert result is not None
    assert "/" not in result
    assert "\\" not in result
    assert ".." not in result


def test_traversal_basename_only() -> None:
    """Only the final path segment is kept, sanitized."""
    assert sanitize_filename("../../etc/passwd") == "passwd"


def test_injection_characters_are_replaced() -> None:
    """Angle brackets and other risky chars become underscores."""
    assert sanitize_filename("<script>.png") == "_script_.png"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("örnek.png", "örnek.png"),
        ("Şçğıüöİ.jpg", "Şçğıüöİ.jpg"),
        ("résumé.docx", "résumé.docx"),
        ("文档.pdf", "文档.pdf"),
    ],
)
def test_unicode_letters_are_preserved(raw: str, expected: str) -> None:
    """Turkish and other non-ASCII letters survive sanitizing intact."""
    assert sanitize_filename(raw) == expected


def test_control_characters_and_null_bytes_removed() -> None:
    """NUL and control bytes are dropped, not replaced."""
    assert sanitize_filename("a\x00b\x1f\x7fc.txt") == "abc.txt"


def test_leading_dots_are_trimmed() -> None:
    """A name cannot collapse into a hidden-file or relative marker."""
    assert sanitize_filename("...hidden.txt") == "hidden.txt"


def test_empty_after_sanitizing_falls_back() -> None:
    """A name that sanitizes to nothing yields the fallback."""
    assert sanitize_filename("...") == "file"
    assert sanitize_filename("\x00\x01") == "file"


def test_long_name_truncated_within_limit_keeping_extension() -> None:
    """Over-limit names are truncated to 255 chars with the extension intact."""
    raw = "a" * 300 + ".png"
    result = sanitize_filename(raw)
    assert result is not None
    assert len(result) <= 255
    assert result.endswith(".png")


def test_custom_max_length_is_respected() -> None:
    """A caller-supplied max_length caps the result, keeping the extension."""
    result = sanitize_filename("a" * 50 + ".png", max_length=20)
    assert result is not None
    assert len(result) <= 20
    assert result.endswith(".png")


def test_prefixed_none_passes_through() -> None:
    """No filename yields no name, with or without a prefix."""
    assert prefixed_filename(None) is None


def test_prefixed_adds_six_digit_prefix() -> None:
    """A sanitized name gains a random 6-digit prefix and separator."""
    result = prefixed_filename("holiday.png")
    assert result is not None
    assert re.fullmatch(r"\d{6}_holiday\.png", result)


def test_prefixed_sanitizes_before_prefixing() -> None:
    """The prefix is applied on top of the sanitized (safe) name."""
    result = prefixed_filename("../../<script>.png")
    assert result is not None
    assert re.fullmatch(r"\d{6}__script_\.png", result)


def test_prefixed_random_varies_between_calls() -> None:
    """Successive prefixes differ, so listings read as unique."""
    prefixes = {prefixed_filename("x.png")[:6] for _ in range(20)}
    assert len(prefixes) > 1


def test_prefixed_stays_within_column_limit() -> None:
    """Prefix + sanitized name never exceeds the 255-char column."""
    result = prefixed_filename("a" * 300 + ".png")
    assert result is not None
    assert len(result) <= 255
    assert result.endswith(".png")
