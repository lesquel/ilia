"""Empty database → catalog seed → public listing.

The first charla is lost if a fresh compose has no courses. This is that path,
against PostgreSQL, skipped when `ILIA_TEST_DATABASE_URL` is unset.
"""

import asyncio
import os
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.domain.entities import Email, Role
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.main import create_app
from scripts.seed_catalog import CANONICAL_SLUGS, publish_catalog

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)

TABLES = (
    "lesson_progress, enrollment, certificate, forum_post, forum_thread, "
    "evaluation_score, evaluation, model_output, llm_usage, submission, activity, "
    "rubric_dimension, rubric, lesson, course_module, course, app_user, cohort"
)


async def _run_sql(statements: list[str], create_schema: bool = False) -> None:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            if create_schema:
                await connection.run_sync(Base.metadata.create_all)
            for statement in statements:
                await connection.execute(text(statement))
    finally:
        await db.dispose()


def sql(statements: list[str], create_schema: bool = False) -> None:
    asyncio.run(_run_sql(statements, create_schema=create_schema))


@pytest.fixture
def client() -> Iterator[TestClient]:
    sql([f"TRUNCATE {TABLES} CASCADE"], create_schema=True)

    settings = Settings(
        environment="local",
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-long-enough-for-hmac-sha256",
        cookie_secure=False,
    )

    with TestClient(create_app(settings)) as test_client:
        yield test_client

    sql([f"TRUNCATE {TABLES} CASCADE"])


async def _publish() -> None:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        owner = AuthUser.register(
            email=Email("catalogo@ilia.local"),
            full_name="Eduardo Calvache",
            password_hash="argon2::fake",
            role=Role.INSTRUCTOR,
            created_at=datetime.now(UTC),
        )
        await SqlAlchemyUserRepository(db).add(owner)
        await publish_catalog(db, owner)
    finally:
        await db.dispose()


def test_empty_database_then_seed_then_catalog_lists_canonical_slugs(
    client: TestClient,
) -> None:
    assert client.get("/api/v1/catalog/courses").json()["items"] == []

    asyncio.run(_publish())

    slugs = [item["slug"] for item in client.get("/api/v1/catalog/courses").json()["items"]]
    assert set(slugs) == set(CANONICAL_SLUGS)
    assert len(slugs) == len(CANONICAL_SLUGS)
