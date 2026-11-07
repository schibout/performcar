#!/usr/bin/env python3
"""Make Claude Code consult graphify before reading or searching application code.

``graphify claude install`` is not used here: its hook looks for
``graphify-out/graph.json`` in the current directory, and this workspace keeps
its graphs in ``backend/`` and ``frontend/``, so it stays silent from the root.

Modes (argv[1]):
  pre   PreToolUse on Read|Grep|Glob. Denies access to backend/frontend code
        until a graphify lookup has run in this session. Afterwards, whole-file
        reads of code only get a reminder, because editing may require them.
  post  PostToolUse on Bash|PowerShell. Records a successful graphify lookup.

Any internal error fails open, so a bug here can never block the session.
"""

import json
import os
import re
import sys
import tempfile
from pathlib import PurePath

ROOT = os.path.normcase(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
APPS = {"backend", "frontend"}
CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs"}
LOOKUP = re.compile(
    r"\bgraphify(?:\.exe)?[\"']?\s+(?:query|explain|path|affected|god-nodes)\b", re.I
)
MARKER_DIR = os.path.join(tempfile.gettempdir(), "claude-graphify-guard")

DENY_REASON = (
    "graphify d'abord : lance `graphify query \"<question>\" --graph "
    "{app}/graphify-out/graph.json` (depuis C:/Projects/template/apps ; "
    "ajoute --budget N si le resultat est tronque, `explain` ou `path` pour un "
    "symbole precis). Lis ensuite uniquement les lignes localisees."
)
READ_REMINDER = (
    "graphify : ce fichier est lu en entier. Sauf s'il faut le modifier, "
    "utilise offset/limit sur les lignes localisees par le graphe."
)


def marker_path(session_id: str) -> str:
    """Return the per-session marker file recording a graphify lookup."""
    return os.path.join(MARKER_DIR, re.sub(r"[^\w-]", "_", session_id or "unknown"))


def relative_parts(target: str) -> tuple[str, ...] | None:
    """Return ``target``'s path parts below the workspace root, or None if outside."""
    # Keep glob characters intact: only the leading literal parts are compared.
    normalized = os.path.normcase(os.path.normpath(target))
    try:
        if os.path.commonpath([ROOT, normalized]) != ROOT:
            return None
    except ValueError:  # Different drives on Windows.
        return None
    return PurePath(os.path.relpath(normalized, ROOT)).parts


def guarded_app(tool: str, tool_input: dict, cwd: str) -> tuple[str | None, bool]:
    """Return (app to query, is whole-file code read) for a tool call, if guarded."""
    if tool == "Read":
        target = tool_input.get("file_path", "")
    elif tool == "Glob":
        target = os.path.join(tool_input.get("path") or cwd, tool_input.get("pattern", ""))
    else:  # Grep
        target = tool_input.get("path") or cwd

    parts = relative_parts(os.path.join(cwd, target))
    if parts is None or "graphify-out" in parts:
        return None, False

    first = parts[0] if parts and parts[0] != "." else ""
    if tool == "Read":
        extension = os.path.splitext(target)[1].lower()
        if first not in APPS or extension not in CODE_EXTENSIONS:
            return None, False
        return first, not tool_input.get("limit")

    if first in APPS:
        return first, False
    # A search from the root (or a root-level wildcard) sweeps both applications.
    if not first or "*" in first:
        return "backend", False
    return None, False


def pre(payload: dict) -> None:
    """Deny guarded access before the first lookup; remind on whole-file reads after."""
    app, whole_file = guarded_app(
        payload.get("tool_name", ""),
        payload.get("tool_input") or {},
        payload.get("cwd") or os.getcwd(),
    )
    if app is None:
        return

    output: dict = {"hookEventName": "PreToolUse"}
    if not os.path.exists(marker_path(payload.get("session_id", ""))):
        output["permissionDecision"] = "deny"
        output["permissionDecisionReason"] = DENY_REASON.format(app=app)
    elif whole_file:
        output["additionalContext"] = READ_REMINDER
    else:
        return
    print(json.dumps({"hookSpecificOutput": output}))


def post(payload: dict) -> None:
    """Record that this session ran a graphify lookup."""
    command = (payload.get("tool_input") or {}).get("command", "")
    if LOOKUP.search(command):
        os.makedirs(MARKER_DIR, exist_ok=True)
        with open(marker_path(payload.get("session_id", "")), "w", encoding="utf-8"):
            pass


def main() -> None:
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    {"pre": pre, "post": post}[sys.argv[1]](payload)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - fail open by design
        print(f"graphify_guard: {exc}", file=sys.stderr)
    sys.exit(0)
