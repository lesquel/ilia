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
from sqlalchemy.orm import selectinload

from app.content.teacher_catalog import TEACHER_ACTIVITIES, TEACHER_COURSES
from app.core.config import get_settings
from app.core.database import Database
from app.features.auth.domain.entities import Email
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.models import CohortModel
from app.features.auth.infrastructure.security import Argon2PasswordHasher
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.billing.infrastructure.models import PlanModel
from app.features.catalog.infrastructure.models import CourseModel, LessonModel, ModuleModel
from app.features.evaluation.infrastructure.models import (
    ActivityModel,
    RubricDimensionModel,
    RubricModel,
)

DEMO_COHORT_CODE = "MANTA-SEP-01"

# The rubric proposed in PRD 9.2, plus the deterministic anchor. The judged
# dimensions carry the PRD's suggested weights; `deterministic` is what the
# platform measures for itself and the judge cannot touch.
DEMO_DIMENSIONS = [
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

# **[A confirmar]** — PRD pregunta abierta 4 deja el cupo del tier gratuito y el
# precio del pago sin definir. Estos números son un punto de partida para poder
# probar el flujo, NO una decisión: viven como filas editables justamente para
# que cambiarlos no necesite un deploy. El precio va en null a propósito.
DEMO_PLANS = [
    {
        "code": "free",
        "name": "Gratis",
        "description": ("Ruta básica completa, cupo mensual de evaluaciones y lectura del foro."),
        "monthly_evaluations": 10,
        "allowed_levels": ["beginner"],
        "can_issue_certificates": False,
        "can_post_in_forum": False,
        "price_cents": 0,
        "is_default": True,
    },
    {
        "code": "pro",
        "name": "Completo",
        "description": (
            "Todas las rutas, cupo amplio de evaluaciones, certificado descargable "
            "y participación en el foro."
        ),
        "monthly_evaluations": 200,
        "allowed_levels": ["beginner", "intermediate", "expert"],
        "can_issue_certificates": True,
        "can_post_in_forum": True,
        # Sin precio: mostrar uno que nadie acordó es peor que no mostrarlo.
        "price_cents": None,
        "is_default": False,
    },
]

DEMO_COURSES = TEACHER_COURSES


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

    # Plans. Idempotent, like everything else in this script.
    async with database.session() as session:
        for plan in DEMO_PLANS:
            exists = await session.execute(select(PlanModel).where(PlanModel.code == plan["code"]))
            if exists.scalar_one_or_none() is None:
                session.add(PlanModel(id=uuid4(), **plan))

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
                for key, name, description, kind, weight in DEMO_DIMENSIONS
            ]
            session.add(shared_rubric)
            await session.flush()

        for activity_data in TEACHER_ACTIVITIES:
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

            # One activity per course in the first seed: reuse the row if the
            # title changed (old demo title) so we do not leave orphans.
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

    await database.dispose()
    print(f"Seeded {len(DEMO_COURSES)} courses for {instructor.full_name}")
    print(f"Cohort code: {DEMO_COHORT_CODE}")
    print(f"Activities: {', '.join(a['title'] for a in TEACHER_ACTIVITIES)}")
    print(f"Plans: {', '.join(str(p['code']) for p in DEMO_PLANS)} (cupos [A confirmar])")


if __name__ == "__main__":
    asyncio.run(main())
