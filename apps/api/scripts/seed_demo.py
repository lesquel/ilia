"""Seed a small demo catalog for local development.

Not a fixture and not a migration: this is throwaway data so the catalog has
something to render while the real content is being produced. Refuses to run
against production.

    uv run python -m scripts.seed_demo
"""

import asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import Database
from app.features.auth.domain.entities import Email
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.models import CohortModel
from app.features.auth.infrastructure.security import Argon2PasswordHasher
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.catalog.infrastructure.models import CourseModel, LessonModel, ModuleModel

DEMO_COHORT_CODE = "MANTA-SEP-01"

DEMO_COURSES = [
    {
        "slug": "prompting-para-docentes",
        "title": "Prompting para docentes",
        "summary": "Ahorrá horas por semana en material de clase",
        "level": "beginner",
        "modules": [
            ("Qué es un prompt", [("Anatomía de un prompt", "video", 420)]),
            (
                "Aplicalo a tu clase",
                [
                    ("Generar una guía de ejercicios", "video", 600),
                    ("Resumir un texto largo", "text", 300),
                    ("Comprobá lo aprendido", "quiz", 180),
                ],
            ),
        ],
    },
    {
        "slug": "notebooklm-en-el-aula",
        "title": "NotebookLM en el aula",
        "summary": "Convertí tus apuntes en material de estudio",
        "level": "intermediate",
        "modules": [
            ("Primeros pasos", [("Cargar tus fuentes", "video", 360)]),
            ("Casos reales", [("Armar una clase completa", "slides", 540)]),
        ],
    },
    {
        "slug": "evaluacion-asistida-por-ia",
        "title": "Evaluación asistida por IA",
        "summary": "Diseñá rúbricas y corregí con criterio",
        "level": "expert",
        "modules": [("Rúbricas", [("Qué mide una buena rúbrica", "text", 480)])],
    },
]


async def main() -> None:
    settings = get_settings()

    if settings.is_production:
        raise SystemExit("Refusing to seed demo data in production")

    if settings.database_url is None:
        raise SystemExit("ILIA_DATABASE_URL is not set")

    database = Database(settings)

    instructor = AuthUser.register(
        email=Email("eduardo@manta.gob.ec"),
        full_name="Eduardo Calvache",
        password_hash=Argon2PasswordHasher().hash("una-clave-larga"),
        created_at=datetime.now(UTC),
    )

    users = SqlAlchemyUserRepository(database)
    existing = await users.get_by_email(instructor.email)
    if existing is None:
        await users.add(instructor)
    else:
        instructor = existing

    # A cohort, so the enrollment flow has a real code to attribute against.
    # This is what makes "how many teachers from the September talk activated an
    # account" answerable (PRD 12).
    cohort_id = uuid4()
    async with database.session() as session:
        existing_cohort = await session.execute(
            select(CohortModel).where(CohortModel.code == DEMO_COHORT_CODE)
        )
        if existing_cohort.scalar_one_or_none() is None:
            session.add(
                CohortModel(
                    id=cohort_id,
                    name="Charla Manta — septiembre 2026",
                    code=DEMO_COHORT_CODE,
                )
            )

    published_at = datetime.now(UTC) - timedelta(days=len(DEMO_COURSES))

    async with database.session() as session:
        for index, course_data in enumerate(DEMO_COURSES):
            # Idempotent: running the seed twice must not explode on the slug
            # unique index, because someone will run it twice.
            already_there = await session.execute(
                select(CourseModel.id).where(CourseModel.slug == str(course_data["slug"]))
            )
            if already_there.scalar_one_or_none() is not None:
                continue

            course = CourseModel(
                id=uuid4(),
                slug=str(course_data["slug"]),
                title=str(course_data["title"]),
                summary=str(course_data["summary"]),
                description=(
                    f"{course_data['summary']}. Curso práctico: cada módulo termina en una "
                    "actividad ejecutable, no en un cuestionario."
                ),
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
                        )
                        for lesson_position, (lesson_title, kind, duration) in enumerate(
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

    await database.dispose()
    print(f"Seeded {len(DEMO_COURSES)} courses for {instructor.full_name}")
    print(f"Cohort code: {DEMO_COHORT_CODE}")


if __name__ == "__main__":
    asyncio.run(main())
