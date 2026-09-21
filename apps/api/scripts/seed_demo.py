"""Seed a local demo instructor, password and cohort.

Canonical courses live in `scripts.seed_catalog` and are safe for the target
environment. This script is the leftover that must not reach production: a
known login and a cohort code for local development.

    uv run python -m scripts.seed_demo
"""

import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select

from app.content.teacher_catalog import TEACHER_ACTIVITIES
from app.core.config import get_settings
from app.core.database import Database
from app.features.auth.domain.entities import Email, Role
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.models import CohortModel
from app.features.auth.infrastructure.security import Argon2PasswordHasher
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.billing.infrastructure.models import PlanModel
from scripts.seed_catalog import publish_catalog

DEMO_COHORT_CODE = "MANTA-SEP-01"
DEMO_INSTRUCTOR_EMAIL = "eduardo@manta.gob.ec"
DEMO_INSTRUCTOR_NAME = "Eduardo Calvache"
DEMO_INSTRUCTOR_PASSWORD = "una-clave-larga"

# **[A confirmar]** — PRD pregunta abierta 4 deja el cupo del tier gratuito y el
# precio del pago sin definir. Estos números son un punto de partida para poder
# probar el flujo, NO una decisión: viven como filas editables justamente para
# que cambiarlos no necesite un deploy. El precio va en null a propósito.
# Production keeps the migration rows; this is only so a local database without
# that migration can still answer entitlements.
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
            "Todas las rutas, cupo amplio de evaluaciones, certificado con código "
            "de verificación y participación en el foro."
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


async def _ensure_demo_instructor(database: Database) -> AuthUser:
    users = SqlAlchemyUserRepository(database)
    password_hash = Argon2PasswordHasher().hash(DEMO_INSTRUCTOR_PASSWORD)
    existing = await users.get_by_email(Email(DEMO_INSTRUCTOR_EMAIL))
    if existing is None:
        instructor = AuthUser.register(
            email=Email(DEMO_INSTRUCTOR_EMAIL),
            full_name=DEMO_INSTRUCTOR_NAME,
            password_hash=password_hash,
            role=Role.INSTRUCTOR,
            created_at=datetime.now(UTC),
        )
        await users.add(instructor)
        return instructor

    existing.full_name = DEMO_INSTRUCTOR_NAME
    existing.password_hash = password_hash
    if not existing.has_at_least(Role.INSTRUCTOR):
        existing.role = Role.INSTRUCTOR
    await users.update(existing)
    return existing


async def main() -> None:
    settings = get_settings()

    if settings.is_production:
        raise SystemExit("Refusing to seed demo data in production")

    if settings.database_url is None:
        raise SystemExit("ILIA_DATABASE_URL is not set")

    database = Database(settings)

    try:
        instructor = await _ensure_demo_instructor(database)

        # A cohort, so the enrollment flow has a real code to attribute against.
        # This is what makes "how many teachers from the September talk activated an
        # account" answerable (PRD 12). Creating cohorts for a real charla is a
        # product action, not this script.
        async with database.session() as session:
            existing_cohort = await session.execute(
                select(CohortModel).where(CohortModel.code == DEMO_COHORT_CODE)
            )
            if existing_cohort.scalar_one_or_none() is None:
                session.add(
                    CohortModel(
                        id=uuid4(),
                        name="Charla Manta — septiembre 2026",
                        code=DEMO_COHORT_CODE,
                    )
                )

        count = await publish_catalog(database, instructor)

        async with database.session() as session:
            for plan in DEMO_PLANS:
                existing = (
                    await session.execute(select(PlanModel).where(PlanModel.code == plan["code"]))
                ).scalar_one_or_none()
                if existing is None:
                    session.add(PlanModel(id=uuid4(), **plan))
                    continue
                # Re-runs must overwrite “certificado descargable” left by older seeds.
                existing.description = str(plan["description"])
    finally:
        await database.dispose()

    print(f"Seeded {count} courses for {instructor.full_name}")
    print(f"Cohort code: {DEMO_COHORT_CODE}")
    print(f"Activities: {', '.join(a['title'] for a in TEACHER_ACTIVITIES)}")
    print(f"Plans: {', '.join(str(p['code']) for p in DEMO_PLANS)} (cupos [A confirmar])")


if __name__ == "__main__":
    asyncio.run(main())
