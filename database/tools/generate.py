"""Export the current Alembic schema using an isolated PostgreSQL 17 container.

Run from apps: uv run --with alembic --with sqlalchemy database/tools/generate.py
No application configuration, credentials or running application DB are used.
"""

from __future__ import annotations

import io
import re
import subprocess
import time
import uuid
from pathlib import Path

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "database"


def docker(*args: str, sql: str | None = None) -> str:
    result = subprocess.run(
        ["docker", *args], input=sql, text=True, encoding="utf-8",
        capture_output=True,
    )
    if result.returncode:
        raise subprocess.CalledProcessError(result.returncode, result.args,
                                            result.stdout, result.stderr)
    return result.stdout


def normalize_dump(dump: str) -> str:
    # pg_dump emits random psql restriction keys and server patch versions.
    lines = [line for line in dump.splitlines()
             if not line.startswith(("\\restrict", "\\unrestrict", "-- Dumped"))]
    return "\n".join(lines).strip() + "\n"


def main() -> None:
    cfg = Config()
    cfg.set_main_option("script_location", str(ROOT / "backend/app/alembic"))
    scripts = ScriptDirectory.from_config(cfg)
    head = scripts.get_current_head()
    assert head is not None
    buffer = io.StringIO()
    context = MigrationContext.configure(
        dialect_name="postgresql",
        opts={"as_sql": True, "literal_binds": True, "output_buffer": buffer},
    )
    with Operations.context(context):
        for revision in reversed(list(scripts.walk_revisions())):
            revision.module.upgrade()

    name = "template-schema-export-" + uuid.uuid4().hex[:12]
    try:
        docker("run", "--detach", "--rm", "--name", name,
               "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17")
        for _ in range(60):
            try:
                docker("exec", name, "pg_isready", "-U", "postgres")
                break
            except subprocess.CalledProcessError:
                time.sleep(1)
        else:
            raise RuntimeError("PostgreSQL did not become ready")

        def psql(db: str, sql: str) -> str:
            return docker("exec", "-i", name, "psql", "-X", "-v",
                          "ON_ERROR_STOP=1", "-U", "postgres", "-d", db, sql=sql)

        psql("postgres", "CREATE DATABASE reference; CREATE DATABASE installation;")
        psql("reference", "BEGIN;\n" + buffer.getvalue() + "\nCOMMIT;")
        dump_args = ("exec", name, "pg_dump", "-U", "postgres", "--schema-only",
                     "--no-owner", "--no-privileges")
        schema = normalize_dump(docker(*dump_args, "reference"))
        header = (
            "-- PostgreSQL 17. Schema consolide issu des migrations Alembic.\n"
            f"-- Revision source : {head}. Base vide uniquement.\n"
            "-- Inclut tables, cles, index et extension pg_trgm.\n\n"
        )
        stamp = (
            "-- Suivi Alembic : executer dans la meme transaction que 01_schema.sql.\n"
            "CREATE TABLE public.alembic_version (\n"
            "    version_num VARCHAR(32) NOT NULL,\n"
            "    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)\n"
            ");\n"
            f"INSERT INTO public.alembic_version (version_num) VALUES ('{head}');\n"
        )
        # Verify the exported schema before replacing any delivered artifact.
        psql("installation", "BEGIN;\n" + schema + stamp + "\nCOMMIT;")
        actual = normalize_dump(docker(*dump_args, "--exclude-table=public.alembic_version",
                                       "installation"))
        if actual != schema:
            raise RuntimeError("Exported schema differs from the migration reference")
        (OUT / "01_schema.sql").write_text(header + schema, encoding="utf-8")
        (OUT / "02_alembic_version.sql").write_text(stamp, encoding="utf-8")
        docker("cp", str(OUT), name + ":/scripts")
        docker("exec", name, "psql", "-X", "-U", "postgres", "-d", "postgres",
               "-v", "db_name=entrypoint", "-v", "db_owner=postgres",
               "-f", "/scripts/00_create_database.psql")
        docker("exec", name, "psql", "-X", "-U", "postgres", "-d", "entrypoint",
               "-f", "/scripts/install.psql")
        try:
            docker("exec", name, "psql", "-X", "-U", "postgres", "-d", "entrypoint",
                   "-f", "/scripts/install.psql")
        except subprocess.CalledProcessError:
            pass  # A second install must reject the existing schema.
        else:
            raise RuntimeError("Reinstallation did not reject the existing schema")
        verify = OUT / "verify.sql"
        if verify.exists():
            print(psql("entrypoint", verify.read_text(encoding="utf-8")))
        tables = re.findall(r"CREATE TABLE public\.(\S+)", schema)
        print(f"Verified PostgreSQL 17: {len(tables)} application tables; Alembic {head}.")
        print("Export matches the complete migration chain (columns, defaults, keys, indexes).")
        print("Database creation and install.psql verified; reinstallation rejected safely.")
    finally:
        subprocess.run(["docker", "rm", "--force", name], capture_output=True, check=False)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.stderr or str(error)) from error
