"""Construit performcar-hermes-profile.tar.gz pour `hermes profile import`.

Usage : uv run python build_archive.py
L'archive contient le profil prêt à l'emploi, sans secrets ni fichiers locaux.
"""

from __future__ import annotations

import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "performcar-hermes-profile.tar.gz"
INCLUDE = ["distribution.yaml", "SOUL.md", "config.yaml", ".env.EXAMPLE", "README.md",
           "memories", "skills", "mcp"]
EXCLUDED_PARTS = {".venv", "__pycache__", ".pytest_cache"}
EXCLUDED_NAMES = {".env", "uv.lock"}


def _keep(path: Path) -> bool:
    return not (EXCLUDED_PARTS & set(path.parts)) and path.name not in EXCLUDED_NAMES


def main() -> None:
    with tarfile.open(OUTPUT, "w:gz") as archive:
        for name in INCLUDE:
            source = ROOT / name
            files = [source] if source.is_file() else sorted(source.rglob("*"))
            for file in files:
                relative = file.relative_to(ROOT)
                if file.is_file() and _keep(relative):
                    archive.add(file, arcname=f"performcar/{relative.as_posix()}")
    print(f"Archive écrite : {OUTPUT}")


if __name__ == "__main__":
    main()
