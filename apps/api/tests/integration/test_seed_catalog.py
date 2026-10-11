"""Empty database → catalog seed → public listing.

The first charla is lost if a fresh compose has no courses. This is the
documented operator path (`run(settings)`), against PostgreSQL, skipped when
`ILIA_TEST_DATABASE_URL` is unset.
"""

import asyncio
import os
from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.catalog.infrastructure.models import CourseModel
from app.features.evaluation.infrastructure.models import ActivityModel, RubricModel
from app.main import create_app
from scripts.seed_catalog import (
    CANONICAL_RUBRIC_NAME,
    CANONICAL_SLUGS,
    CATALOG_DIMENSIONS,
    CATALOG_OWNER_EMAIL,
    run,
)

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)

COURSES = "/api/v1/catalog/courses"

TABLES = (
    "learning.lesson_progress, learning.enrollment, learning.certificate, community.forum_post, "
    "community.forum_thread, assessment.evaluation_score, assessment.evaluation, "
    "assessment.model_output, billing.llm_usage, assessment.submission, assessment.activity, "
    "assessment.rubric_dimension, assessment.rubric, catalog.lesson, catalog.course_module, "
    "catalog.course, auth.app_user, learning.cohort, billing.subscription, billing.plan"
)


def _settings() -> Settings:
    return Settings(
        environment="local",
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-long-enough-for-hmac-sha256",
        cookie_secure=False,
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

    with TestClient(create_app(_settings())) as test_client:
        yield test_client

    sql([f"TRUNCATE {TABLES} CASCADE"])


async def _canonical_activity_rubrics() -> list[tuple[str, str, tuple[str, ...]]]:
    db = Database(_settings())
    try:
        async with db.session() as session:
            rows = (
                await session.execute(
                    select(CourseModel.slug, RubricModel.name, RubricModel.id)
                    .join(ActivityModel, ActivityModel.course_id == CourseModel.id)
                    .join(RubricModel, RubricModel.id == ActivityModel.rubric_id)
                    .where(CourseModel.slug.in_(CANONICAL_SLUGS))
                )
            ).all()
            result: list[tuple[str, str, tuple[str, ...]]] = []
            for slug, name, rubric_id in rows:
                keys = (
                    (
                        await session.execute(
                            text(
                                "SELECT key FROM assessment.rubric_dimension "
                                "WHERE rubric_id = :id ORDER BY key"
                            ),
                            {"id": rubric_id},
                        )
                    )
                    .scalars()
                    .all()
                )
                result.append((slug, name, tuple(keys)))
            return result
    finally:
        await db.dispose()


async def _owner_exists() -> bool:
    db = Database(_settings())
    try:
        async with db.session() as session:
            row = await session.execute(
                text("SELECT 1 FROM auth.app_user WHERE email = :email"),
                {"email": CATALOG_OWNER_EMAIL},
            )
            return row.first() is not None
    finally:
        await db.dispose()


def test_empty_database_then_run_then_catalog_lists_canonical_slugs(
    client: TestClient,
) -> None:
    assert client.get(COURSES).json()["items"] == []

    asyncio.run(run(_settings()))

    slugs = [item["slug"] for item in client.get(COURSES).json()["items"]]
    assert set(slugs) == set(CANONICAL_SLUGS)
    assert len(slugs) == len(CANONICAL_SLUGS)
    assert asyncio.run(_owner_exists())

    activities = asyncio.run(_canonical_activity_rubrics())
    assert {slug for slug, _, _ in activities} == set(CANONICAL_SLUGS)
    expected_keys = tuple(sorted(row[0] for row in CATALOG_DIMENSIONS))
    for _, name, keys in activities:
        assert name == CANONICAL_RUBRIC_NAME
        assert keys == expected_keys


def test_canonical_labs_ignore_a_preexisting_unrelated_rubric(client: TestClient) -> None:
    sql(
        [f"INSERT INTO assessment.rubric (id, version, name) VALUES ('{uuid4()}', 1, 'Rúbrica de otro curso')"]
    )

    asyncio.run(run(_settings()))

    activities = asyncio.run(_canonical_activity_rubrics())
    assert len(activities) == len(CANONICAL_SLUGS)
    assert {name for _, name, _ in activities} == {CANONICAL_RUBRIC_NAME}
