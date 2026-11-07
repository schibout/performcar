import re
import secrets
from pathlib import PurePosixPath, PureWindowsPath

# Column limit for File.filename; the sanitized result must fit within it.
_MAX_LENGTH = 255

# Width of the random numeric prefix prepended to stored filenames.
_PREFIX_DIGITS = 6

# Fallback used when sanitizing strips a name down to nothing.
_FALLBACK = "file"

# Characters allowed verbatim in a stored filename: Unicode letters/digits
# (``\w`` covers "ö", "ç", "ş", and non-Latin scripts) plus a small set of
# readable separators. Everything else is replaced with "_".
_DISALLOWED = re.compile(r"[^\w .()\-]", re.UNICODE)

# Control characters (incl. NUL) are stripped outright rather than replaced.
_CONTROL = re.compile(r"[\x00-\x1f\x7f]")


def sanitize_filename(
    filename: str | None, max_length: int = _MAX_LENGTH
) -> str | None:
    """Reduce a user-supplied filename to a safe, readable display name.

    Strips any path components (defeating ``../`` traversal), removes control
    characters and NUL bytes, replaces injection-prone characters with ``_``,
    collapses leading/repeated dots, and truncates to ``max_length`` while
    preserving the extension. Returns ``None`` when given ``None`` so the
    optional column stays optional; falls back to ``"file"`` when sanitizing
    leaves nothing usable. ``max_length`` lets callers reserve room for a
    prefix so the combined value still fits the column.
    """
    if filename is None:
        return None

    # Take the basename only, handling both POSIX and Windows separators so a
    # crafted "..\\..\\x" or "../../x" cannot smuggle directory parts through.
    base = PureWindowsPath(PurePosixPath(filename).name).name

    base = _CONTROL.sub("", base)
    base = _DISALLOWED.sub("_", base)

    # Collapse runs of dots (kills "..") and trim leading dots so the result is
    # never a relative marker or a hidden-file name.
    base = re.sub(r"\.{2,}", ".", base).lstrip(". ").strip()

    if not base:
        return _FALLBACK

    if len(base) <= max_length:
        return base

    # Over the limit: keep the extension and truncate the stem instead of
    # blindly cutting the tail (which would drop the extension entirely).
    stem, dot, ext = base.rpartition(".")
    if dot and 0 < len(ext) <= 10:
        keep = max_length - len(dot) - len(ext)
        truncated = (stem[:keep] + dot + ext) if keep > 0 else base[:max_length]
    else:
        truncated = base[:max_length]
    return truncated.strip(". ") or _FALLBACK


def prefixed_filename(filename: str | None) -> str | None:
    """Sanitize a display filename and prepend a random numeric prefix.

    Produces names like ``482719_holiday.png`` so stored files read as visually
    unique in listings without depending on the original name. Returns ``None``
    when no filename was supplied. The sanitized part is truncated to leave room
    for the prefix, keeping the combined value within the column limit.
    """
    prefix = f"{secrets.randbelow(9 * 10 ** (_PREFIX_DIGITS - 1)) + 10 ** (_PREFIX_DIGITS - 1)}"
    sep = "_"
    sanitized = sanitize_filename(
        filename, max_length=_MAX_LENGTH - len(prefix) - len(sep)
    )
    if sanitized is None:
        return None
    return f"{prefix}{sep}{sanitized}"
