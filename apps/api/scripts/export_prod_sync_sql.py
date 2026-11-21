"""Export one idempotent SQL file that brings an Alembic-less Postgres up to date.

The production database was created without Alembic and is behind the ORM
models. This script does not touch that database: it only writes SQL, to be
reviewed and then applied by hand (`psql -v ON_ERROR_STOP=1 -f prod-sync.sql`).

The file is a single transaction and is safe to run twice. It never drops or
alters an existing column, and it never rewrites existing catalog content
(lesson titles, bodies and `resource_ref` uploaded from /instructor stay).

    uv run python -m scripts.export_prod_sync_sql [output.sql]
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import (
    CheckConstraint,
    Constraint,
    ForeignKeyConstraint,
    Index,
    PrimaryKeyConstraint,
    Table,
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import (
    AddConstraint,
    CreateColumn,
    CreateIndex,
    CreateSchema,
    CreateTable,
)

from app.content.teacher_catalog import TEACHER_ACTIVITIES, TEACHER_COURSES
from app.core.database import Base
from app.features.admin.infrastructure import models as admin_models  # noqa: F401
from app.features.auth.infrastructure import models as auth_models  # noqa: F401
from app.features.billing.infrastructure import models as billing_models  # noqa: F401
from app.features.catalog.infrastructure import models as catalog_models  # noqa: F401
from app.features.certificates.infrastructure import models as certificate_models  # noqa: F401
from app.features.enrollment.infrastructure import models as enrollment_models  # noqa: F401
from app.features.evaluation.infrastructure import models as evaluation_models  # noqa: F401
from app.features.forum.infrastructure import models as forum_models  # noqa: F401
from scripts.seed_catalog import CANONICAL_RUBRIC_NAME, CATALOG_DIMENSIONS

API_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = Path(
    "/private/tmp/claude-501/-Users-figueroa-Desktop-ILIA/"
    "cfdd6083-3fd4-4be4-b84d-4d02d63c1857/scratchpad/prod-sync.sql"
)

# What production lacks today (from information_schema), by qualified name.
MISSING_TABLES = (
    "assessment.rubric",
    "assessment.rubric_dimension",
    "assessment.evaluation_score",
    "assessment.model_output",
    "audit.audit_log",
    "billing.llm_usage",
    "billing.subscription",
)
MISSING_COLUMNS: dict[str, tuple[str, ...]] = {
    "assessment.activity": ("checks", "rubric_id", "statement"),
    "assessment.evaluation": (
        "check_failures",
        "evaluated_at",
        "feedback",
        "model_version",
        "override_at",
        "override_by",
        "override_reason",
        "override_total",
        "rubric_version",
        "suggestion",
        "total",
    ),
    "assessment.submission": (
        "attempt",
        "content_purged_at",
        "failure_reason",
        "idempotency_key",
        "prompt",
    ),
    "community.forum_thread": ("cohort_id",),
    "identity.app_user": ("avatar_key", "avatar_ref"),
}

CANONICAL_RUBRIC_ID = uuid5(NAMESPACE_URL, "https://ilia.local/catalog/rubric/prompting")
INSTRUCTOR_SOURCE_SLUG = "ia-para-docentes"

PG = postgresql.dialect()


def q(value: object) -> str:
    """SQL string literal. Standard-conforming: only the quote needs doubling."""
    return "'" + str(value).replace("'", "''") + "'"


def ddl(element: object) -> str:
    return str(element.compile(dialect=PG)).strip()  # type: ignore[attr-defined]


def qualified(table: Table) -> str:
    return f"{table.schema}.{table.name}"


def sorted_indexes(table: Table) -> list[Index]:
    return sorted(table.indexes, key=lambda i: str(i.name))


def guarded(table: Table, name: str, statement: str) -> str:
    """Run `statement` only when the named constraint is not there yet."""
    return (
        "DO $guard$ BEGIN\n"
        f"  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = {q(name)} "
        f"AND conrelid = {q(qualified(table))}::regclass) THEN\n"
        f"    {statement};\n"
        "  END IF;\n"
        "END $guard$;"
    )


def touches(constraint: Constraint, new_columns: set[str]) -> bool:
    if isinstance(constraint, CheckConstraint):
        text = str(constraint.sqltext)
        return any(re.search(rf"\b{re.escape(c)}\b", text) for c in new_columns)
    return any(c.name in new_columns for c in constraint.columns)  # type: ignore[attr-defined]


def schema_sql() -> list[str]:
    out = ["-- 1. Schemas and missing tables"]
    tables = [Base.metadata.tables[name] for name in MISSING_TABLES]
    schemas = sorted({t.schema for t in tables if t.schema})
    out += [ddl(CreateSchema(s, if_not_exists=True)) + ";" for s in schemas]
    for table in Base.metadata.sorted_tables:
        if qualified(table) not in MISSING_TABLES:
            continue
        out.append(ddl(CreateTable(table, if_not_exists=True)) + ";")
        out += [ddl(CreateIndex(ix, if_not_exists=True)) + ";" for ix in sorted_indexes(table)]

    out.append("\n-- 2. Missing columns on existing tables (and what hangs off them)")
    for name, columns in MISSING_COLUMNS.items():
        table = Base.metadata.tables[name]
        wanted = set(columns)
        for column in columns:
            spec = ddl(CreateColumn(table.c[column]))
            out.append(f"ALTER TABLE {name} ADD COLUMN IF NOT EXISTS {spec};")
        for constraint in sorted(table.constraints, key=lambda c: str(c.name)):
            if isinstance(constraint, PrimaryKeyConstraint) or not touches(constraint, wanted):
                continue
            if constraint.name is None:
                if not isinstance(constraint, ForeignKeyConstraint):
                    raise SystemExit(f"unnamed constraint on {name}: {constraint}")
                # Same name Postgres would give an inline REFERENCES.
                constraint.name = f"{table.name}_{constraint.columns.keys()[0]}_fkey"
            out.append(guarded(table, constraint.name, ddl(AddConstraint(constraint))))
        for index in sorted_indexes(table):
            if any(c.name in wanted for c in index.columns):
                out.append(ddl(CreateIndex(index, if_not_exists=True)) + ";")
    return out


def rubric_sql() -> list[str]:
    out = ["\n-- 3. Canonical rubric (only when no rubric has that name)"]
    out.append(
        "INSERT INTO assessment.rubric (id, version, name)\n"
        f"SELECT {q(CANONICAL_RUBRIC_ID)}, 1, {q(CANONICAL_RUBRIC_NAME)}\n"
        "WHERE NOT EXISTS (SELECT 1 FROM assessment.rubric "
        f"WHERE name = {q(CANONICAL_RUBRIC_NAME)});"
    )
    rubric = (
        f"(SELECT id FROM assessment.rubric WHERE name = {q(CANONICAL_RUBRIC_NAME)} "
        "ORDER BY version DESC LIMIT 1)"
    )
    for key, name, description, kind, weight in CATALOG_DIMENSIONS:
        out.append(
            "INSERT INTO assessment.rubric_dimension "
            "(id, rubric_id, key, name, description, kind, weight)\n"
            f"SELECT gen_random_uuid(), r.id, {q(key)}, {q(name)}, {q(description)}, "
            f"{q(kind)}, {float(weight)}\n"
            f"FROM (SELECT {rubric} AS id) r\n"
            "WHERE NOT EXISTS (SELECT 1 FROM assessment.rubric_dimension d "
            f"WHERE d.rubric_id = r.id AND d.key = {q(key)});"
        )
    return out


def course_description(course: dict) -> str:
    written = str(course.get("description") or "").strip()
    if written:
        return written
    return (
        f"{course['summary']}. Curso práctico: cada módulo termina en una "
        "actividad ejecutable, no en un cuestionario."
    )


def courses_sql() -> list[str]:
    out = ["\n-- 4. Courses, modules and lessons (existing rows are never modified)"]
    for index, course in enumerate(TEACHER_COURSES):
        slug = q(course["slug"])
        # Seed spacing: the first course is the newest, each next one a day older.
        age = f"now() - interval '{index} days'"
        out.append(
            "INSERT INTO catalog.course (id, slug, title, summary, description, level, "
            "status, instructor_id, created_at, published_at)\n"
            f"SELECT gen_random_uuid(), {slug}, {q(course['title'])}, {q(course['summary'])}, "
            f"{q(course_description(course))}, {q(course['level'])}, 'published',\n"
            "  (SELECT instructor_id FROM catalog.course "
            f"WHERE slug = {q(INSTRUCTOR_SOURCE_SLUG)}),\n"
            f"  {age}, {age}\n"
            f"WHERE NOT EXISTS (SELECT 1 FROM catalog.course WHERE slug = {slug});"
        )
        for position, (module_title, lessons) in enumerate(course["modules"], start=1):
            out.append(
                "INSERT INTO catalog.course_module (id, course_id, title, position)\n"
                f"SELECT gen_random_uuid(), c.id, {q(module_title)}, {position}\n"
                f"FROM catalog.course c WHERE c.slug = {slug}\n"
                "AND NOT EXISTS (SELECT 1 FROM catalog.course_module m "
                f"WHERE m.course_id = c.id AND m.position = {position});"
            )
            rows = []
            for lesson_position, lesson in enumerate(lessons, start=1):
                title, kind, duration, body = lesson[:4]
                resource = q(lesson[4]) if len(lesson) > 4 and lesson[4] else "NULL"
                rows.append(
                    f"({q(title)}, {q(kind)}, {lesson_position}, {int(duration)}, "
                    f"{q(body)}, {resource})"
                )
            # One statement per module, so the emptiness check is taken once. An
            # existing module (with its uploaded media) is left exactly as it is.
            out.append(
                "INSERT INTO catalog.lesson (id, module_id, course_id, title, kind, "
                "position, duration_seconds, body, resource_ref)\n"
                "SELECT gen_random_uuid(), m.id, m.course_id, v.title, v.kind, v.position, "
                "v.duration_seconds, v.body, v.resource_ref\n"
                "FROM catalog.course c JOIN catalog.course_module m ON m.course_id = c.id\n"
                "CROSS JOIN (VALUES\n  " + ",\n  ".join(rows) + "\n) AS v(title, kind, position, "
                "duration_seconds, body, resource_ref)\n"
                f"WHERE c.slug = {slug} AND m.position = {position}\n"
                "AND NOT EXISTS (SELECT 1 FROM catalog.lesson l WHERE l.module_id = m.id);"
            )
    return out


def activities_sql() -> list[str]:
    out = ["\n-- 5. Labs (skipped when the course already has a lab with that title)"]
    rubric = (
        f"(SELECT id FROM assessment.rubric WHERE name = {q(CANONICAL_RUBRIC_NAME)} "
        "ORDER BY version DESC LIMIT 1)"
    )
    for activity in TEACHER_ACTIVITIES:
        slug = q(activity["course_slug"])
        position = activity.get("module_position")
        if position is not None:
            module_filter = f"m.position = {int(position)}"
            guard = ""
        else:
            # Seed rule: with no module_position the lab lives in the last
            # module, and a course that already has a lab keeps that one.
            module_filter = (
                "m.position = (SELECT max(position) FROM catalog.course_module "
                "WHERE course_id = c.id)"
            )
            guard = (
                "\nAND NOT EXISTS (SELECT 1 FROM assessment.activity a0 WHERE a0.course_id = c.id)"
            )
        checks = json.dumps(activity["checks"], ensure_ascii=False)
        out.append(
            "INSERT INTO assessment.activity (id, module_id, course_id, rubric_id, title, "
            "statement, max_attempts, checks)\n"
            f"SELECT gen_random_uuid(), m.id, c.id, {rubric}, {q(activity['title'])}, "
            f"{q(activity['statement'])}, 3, {q(checks)}::json\n"
            "FROM catalog.course c JOIN catalog.course_module m ON m.course_id = c.id\n"
            f"WHERE c.slug = {slug} AND {module_filter}\n"
            "AND NOT EXISTS (SELECT 1 FROM assessment.activity a "
            f"WHERE a.course_id = c.id AND a.title = {q(activity['title'])}){guard};"
        )
    return out


def alembic_head() -> str:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "migrations"))
    heads = ScriptDirectory.from_config(config).get_heads()
    if len(heads) != 1:
        raise SystemExit(f"expected exactly one alembic head, got {heads}")
    return heads[0]


def stamp_sql() -> list[str]:
    head = alembic_head()
    return [
        "\n-- 6. Alembic stamp (only when the table is empty)",
        "CREATE TABLE IF NOT EXISTS public.alembic_version "
        "(version_num varchar(32) NOT NULL PRIMARY KEY);",
        f"INSERT INTO public.alembic_version (version_num)\nSELECT {q(head)}\n"
        "WHERE NOT EXISTS (SELECT 1 FROM public.alembic_version);",
    ]


def build_sql() -> str:
    parts = [
        "-- ILIA production sync. Idempotent: safe to run more than once.",
        f"-- Generated {datetime.now(UTC).isoformat(timespec='seconds')} by "
        "scripts/export_prod_sync_sql.py",
        "-- Apply: psql -v ON_ERROR_STOP=1 -f prod-sync.sql",
        "BEGIN;",
        "",
        *schema_sql(),
        *rubric_sql(),
        *courses_sql(),
        *activities_sql(),
        *stamp_sql(),
        "\nCOMMIT;",
        "",
    ]
    return "\n".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(build_sql(), encoding="utf-8")
    print(f"Wrote {args.output} ({args.output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
