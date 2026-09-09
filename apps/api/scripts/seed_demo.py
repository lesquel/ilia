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

DEMO_ACTIVITY_TITLE = "Escribí tu primer prompt"

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

DEMO_COURSES = [
    {
        "slug": "prompting-para-docentes",
        "title": "Prompting para docentes",
        "summary": "Ahorrá horas por semana en material de clase",
        "level": "beginner",
        "modules": [
            (
                "Qué es un prompt",
                [
                    (
                        "Anatomía de un prompt",
                        "video",
                        420,
                        "Un prompt útil tiene cuatro partes: el ROL que le pedís al modelo "
                        "que asuma, el CONTEXTO de tu clase, la TAREA concreta y el FORMATO "
                        "en el que querés la respuesta.\n\n"
                        "Comparalo:\n\n"
                        '"Hacé un ejercicio de fracciones."\n\n'
                        "contra\n\n"
                        '"Sos docente de matemática de séptimo. Escribí 5 ejercicios de suma '
                        "de fracciones con distinto denominador, de dificultad creciente, "
                        'con la respuesta al final en una tabla."\n\n'
                        "El segundo no es más largo por adorno: cada palabra que agregaste "
                        "elimina una decisión que el modelo iba a tomar por vos.",
                    )
                ],
            ),
            (
                "Aplicalo a tu clase",
                [
                    (
                        "Generar una guía de ejercicios",
                        "video",
                        600,
                        "Vamos a armar una guía completa partiendo del temario que ya tenés. "
                        "La clave es darle al modelo tu contexto real: el curso, el nivel, "
                        "cuánto tiempo tenés y qué ya vieron tus alumnos.",
                    ),
                    (
                        "Resumir un texto largo",
                        "text",
                        300,
                        "Pedir 'resumime esto' devuelve un resumen genérico. Pedí en cambio "
                        "para quién es el resumen y para qué lo vas a usar.\n\n"
                        "Probá: 'Resumí este texto en 5 viñetas para alumnos de 14 años que "
                        "nunca vieron el tema, y agregá una pregunta de comprensión por "
                        "viñeta.'",
                    ),
                    (
                        "Comprobá lo aprendido",
                        "quiz",
                        180,
                        "Antes de seguir: escribí un prompt para generar material de tu "
                        "próxima clase que incluya las cuatro partes: rol, contexto, tarea "
                        "y formato.",
                    ),
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
            (
                "Primeros pasos",
                [
                    (
                        "Cargar tus fuentes",
                        "video",
                        360,
                        "NotebookLM trabaja solo con las fuentes que vos le das. Eso es una "
                        "limitación y también su mayor ventaja: no inventa desde internet, "
                        "responde desde tu material.",
                    )
                ],
            ),
            (
                "Casos reales",
                [
                    (
                        "Armar una clase completa",
                        "slides",
                        540,
                        "Cargá el capítulo del libro, tus apuntes y la planificación. "
                        "Después pedile una guía de estudio, preguntas de repaso y un "
                        "resumen para las familias.",
                    )
                ],
            ),
        ],
    },
    {
        "slug": "evaluacion-asistida-por-ia",
        "title": "Evaluación asistida por IA",
        "summary": "Diseñá rúbricas y corregí con criterio",
        "level": "expert",
        "modules": [
            (
                "Rúbricas",
                [
                    (
                        "Qué mide una buena rúbrica",
                        "text",
                        480,
                        "Una rúbrica que solo dice 'excelente / bueno / regular' no mide "
                        "nada: mide la impresión de quien corrige. Una que sirve nombra "
                        "dimensiones observables y qué se ve en cada nivel.",
                    )
                ],
            )
        ],
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

    # An activity on the first course, so the Lab has something to run.
    async with database.session() as session:
        already = await session.execute(
            select(ActivityModel).where(ActivityModel.title == DEMO_ACTIVITY_TITLE)
        )
        if already.scalar_one_or_none() is None:
            course_row = (
                await session.execute(
                    select(CourseModel).where(CourseModel.slug == "prompting-para-docentes")
                )
            ).scalar_one()
            module_row = (
                (
                    await session.execute(
                        select(ModuleModel)
                        .where(ModuleModel.course_id == course_row.id)
                        .order_by(ModuleModel.position)
                    )
                )
                .scalars()
                .first()
            )

            rubric = RubricModel(id=uuid4(), version=1, name="Rúbrica base de prompting")
            rubric.dimensions = [
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
            session.add(rubric)

            session.add(
                ActivityModel(
                    id=uuid4(),
                    module_id=module_row.id,
                    course_id=course_row.id,
                    rubric_id=rubric.id,
                    title=DEMO_ACTIVITY_TITLE,
                    statement=(
                        "Escribí un prompt que le pida a un modelo una guía de 5 ejercicios "
                        "de fracciones para séptimo grado, de dificultad creciente.\n\n"
                        "Tu prompt tiene que darle un rol al modelo, decir en qué formato "
                        "querés la respuesta y mencionar explícitamente las fracciones."
                    ),
                    max_attempts=3,
                    checks={
                        "requires_role": True,
                        "requires_format": True,
                        "required_terms": [["fracciones", "quebrados"]],
                        "min_length": 15,
                    },
                )
            )

    await database.dispose()
    print(f"Seeded {len(DEMO_COURSES)} courses for {instructor.full_name}")
    print(f"Cohort code: {DEMO_COHORT_CODE}")
    print(f"Activity: {DEMO_ACTIVITY_TITLE}")
    print(f"Plans: {', '.join(str(p['code']) for p in DEMO_PLANS)} (cupos [A confirmar])")


if __name__ == "__main__":
    asyncio.run(main())
