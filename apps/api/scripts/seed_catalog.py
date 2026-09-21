"""Publish the canonical teacher catalog.

This is the content the first charla needs in the target environment. It is
not throwaway, and it does not create a login. A fresh compose has no courses
until this runs.

    uv run python -m scripts.seed_catalog
    docker compose run --rm api python -m scripts.seed_catalog
"""

from __future__ import annotations

import asyncio
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.content.teacher_catalog import TEACHER_ACTIVITIES, TEACHER_COURSES
from app.core.config import Settings, get_settings
from app.core.database import Database
from app.features.auth.domain.entities import Email, Role
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.security import Argon2PasswordHasher
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.catalog.infrastructure.models import CourseModel, LessonModel, ModuleModel
from app.features.evaluation.infrastructure.models import (
    ActivityModel,
    RubricDimensionModel,
    RubricModel,
)

CANONICAL_SLUGS = (
    "prompting-para-docentes",
    "notebooklm-en-el-aula",
    "evaluacion-asistida-por-ia",
)

CATALOG_COURSES = TEACHER_COURSES
CATALOG_ACTIVITIES = TEACHER_ACTIVITIES

# Display name on course cards. The email is synthetic so a real teacher can
# still register with their own address; the password is random and never printed.
CATALOG_OWNER_EMAIL = "catalogo@ilia.local"
CATALOG_OWNER_NAME = "Eduardo Calvache"

# The rubric proposed in PRD 9.2, plus the deterministic anchor. The judged
# dimensions carry the PRD's suggested weights; `deterministic` is what the
# platform measures for itself and the judge cannot touch.
CATALOG_DIMENSIONS = [
    ("claridad", "Claridad y especificidad", "¿La instrucción es inequívoca?", "prompt", 20),
    ("contexto", "Contexto y rol", "¿Aporta contexto, audiencia y rol del modelo?", "prompt", 15),
    (
        "formato",
        "Restricciones y formato",
        "¿Define formato, longitud, tono o límites?",
        "prompt",
        15,
    ),
    ("adecuacion", "Adecuación a la tarea", "¿Ataca lo que pide el enunciado?", "prompt", 20),
    ("resultado", "Calidad del resultado", "¿La salida cumple el objetivo?", "result", 30),
    (
        "deterministic",
        "Requisitos verificables",
        "Lo que la plataforma comprueba por sí misma, sin intervención de un modelo.",
        "prompt",
        20,
    ),
]


def _course_description(course_data: dict) -> str:
    written = str(course_data.get("description") or "").strip()
    if written:
        return written
    return (
        f"{course_data['summary']}. Curso práctico: cada módulo termina en una "
        "actividad ejecutable, no en un cuestionario."
    )


def _sync_modules(course: CourseModel, modules_data: list) -> None:
    """Create missing modules/lessons and refresh titles and bodies."""
    by_position = {module.position: module for module in course.modules}
    for position, (module_title, lessons) in enumerate(modules_data, start=1):
        module = by_position.get(position)
        if module is None:
            module = ModuleModel(id=uuid4(), title=module_title, position=position, lessons=[])
            course.modules.append(module)
        else:
            module.title = module_title
        lessons_by_position = {lesson.position: lesson for lesson in module.lessons}
        for lesson_position, (lesson_title, kind, duration, body) in enumerate(lessons, start=1):
            lesson = lessons_by_position.get(lesson_position)
            if lesson is None:
                module.lessons.append(
                    LessonModel(
                        id=uuid4(),
                        title=lesson_title,
                        kind=kind,
                        position=lesson_position,
                        duration_seconds=duration,
                        body=body,
                    )
                )
            else:
                lesson.title = lesson_title
                lesson.kind = kind
                lesson.duration_seconds = duration
                lesson.body = body


def _require_canonical_catalog() -> None:
    slugs = tuple(str(course["slug"]) for course in CATALOG_COURSES)
    if slugs != CANONICAL_SLUGS:
        raise SystemExit(f"teacher_catalog slugs {slugs} do not match canonical {CANONICAL_SLUGS}")


async def ensure_catalog_owner(database: Database) -> AuthUser:
    """Instructor that owns seeded courses. Nobody is told a password."""
    users = SqlAlchemyUserRepository(database)
    existing = await users.get_by_email(Email(CATALOG_OWNER_EMAIL))
    if existing is not None:
        return existing

    owner = AuthUser.register(
        email=Email(CATALOG_OWNER_EMAIL),
        full_name=CATALOG_OWNER_NAME,
        password_hash=Argon2PasswordHasher().hash(secrets.token_urlsafe(48)),
        role=Role.INSTRUCTOR,
        created_at=datetime.now(UTC),
    )
    await users.add(owner)
    return owner


async def publish_catalog(database: Database, instructor: AuthUser) -> int:
    """Idempotently publish TEACHER_COURSES and their labs."""
    _require_canonical_catalog()

    published_at = datetime.now(UTC) - timedelta(days=len(CATALOG_COURSES))

    async with database.session() as session:
        for index, course_data in enumerate(CATALOG_COURSES):
            already_there = await session.execute(
                select(CourseModel)
                .options(selectinload(CourseModel.modules).selectinload(ModuleModel.lessons))
                .where(CourseModel.slug == str(course_data["slug"]))
            )
            existing_course = already_there.scalar_one_or_none()
            if existing_course is not None:
                existing_course.title = str(course_data["title"])
                existing_course.summary = str(course_data["summary"])
                existing_course.description = _course_description(course_data)
                _sync_modules(existing_course, course_data["modules"])
                continue

            course = CourseModel(
                id=uuid4(),
                slug=str(course_data["slug"]),
                title=str(course_data["title"]),
                summary=str(course_data["summary"]),
                description=_course_description(course_data),
                level=str(course_data["level"]),
                status="published",
                instructor_id=instructor.id,
                created_at=published_at + timedelta(days=index),
                published_at=published_at + timedelta(days=index),
            )

            course.modules = [
                ModuleModel(
                    id=uuid4(),
                    title=module_title,
                    position=module_position,
                    lessons=[
                        LessonModel(
                            id=uuid4(),
                            title=lesson_title,
                            kind=kind,
                            position=lesson_position,
                            duration_seconds=duration,
                            body=body,
                        )
                        for lesson_position, (lesson_title, kind, duration, body) in enumerate(
                            lessons, start=1
                        )
                    ],
                )
                for module_position, (module_title, lessons) in enumerate(
                    course_data["modules"],  # type: ignore[arg-type]
                    start=1,
                )
            ]

            session.add(course)

    async with database.session() as session:
        shared_rubric = (await session.execute(select(RubricModel).limit(1))).scalar_one_or_none()
        if shared_rubric is None:
            shared_rubric = RubricModel(id=uuid4(), version=1, name="Rúbrica base de prompting")
            shared_rubric.dimensions = [
                RubricDimensionModel(
                    id=uuid4(),
                    key=key,
                    name=name,
                    description=description,
                    kind=kind,
                    weight=weight,
                )
                for key, name, description, kind, weight in CATALOG_DIMENSIONS
            ]
            session.add(shared_rubric)
            await session.flush()

        for activity_data in CATALOG_ACTIVITIES:
            course_row = (
                await session.execute(
                    select(CourseModel).where(CourseModel.slug == activity_data["course_slug"])
                )
            ).scalar_one()
            already = await session.execute(
                select(ActivityModel).where(
                    ActivityModel.course_id == course_row.id,
                    ActivityModel.title == activity_data["title"],
                )
            )
            existing_activity = already.scalars().first()
            if existing_activity is not None:
                existing_activity.statement = activity_data["statement"]
                existing_activity.checks = activity_data["checks"]
                continue

            previous = await session.execute(
                select(ActivityModel).where(ActivityModel.course_id == course_row.id)
            )
            previous_activity = previous.scalars().first()
            if previous_activity is not None:
                previous_activity.title = activity_data["title"]
                previous_activity.statement = activity_data["statement"]
                previous_activity.checks = activity_data["checks"]
                continue

            module_row = (
                (
                    await session.execute(
                        select(ModuleModel)
                        .where(ModuleModel.course_id == course_row.id)
                        .order_by(ModuleModel.position.desc())
                    )
                )
                .scalars()
                .first()
            )
            session.add(
                ActivityModel(
                    id=uuid4(),
                    module_id=module_row.id,
                    course_id=course_row.id,
                    rubric_id=shared_rubric.id,
                    title=activity_data["title"],
                    statement=activity_data["statement"],
                    max_attempts=3,
                    checks=activity_data["checks"],
                )
            )

    return len(CATALOG_COURSES)


async def run(settings: Settings | None = None) -> None:
    settings = settings or get_settings()

    if settings.database_url is None:
        raise SystemExit("ILIA_DATABASE_URL is not set")

    database = Database(settings)
    try:
        instructor = await ensure_catalog_owner(database)
        count = await publish_catalog(database, instructor)
        print(f"Seeded {count} canonical courses")
        print(f"Slugs: {', '.join(CANONICAL_SLUGS)}")
    finally:
        await database.dispose()


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
