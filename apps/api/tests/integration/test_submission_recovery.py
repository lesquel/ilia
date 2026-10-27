"""Claiming abandoned submissions, against a real PostgreSQL.

The atomicity here cannot be tested against the in-memory fake: `FOR UPDATE
SKIP LOCKED` is the whole mechanism, and it only exists in the database. Two
replicas booting together must not both claim the same submission — that would
run the evaluation twice and bill for both.
"""

import asyncio
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.evaluation.domain.entities import MAX_RECOVERIES, SubmissionStatus
from app.features.evaluation.infrastructure.sql_repository import (
    SqlAlchemySubmissionRepository,
)

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)

NOW = datetime(2026, 9, 9, 12, 0, tzinfo=UTC)
TABLES = (
    "assessment.submission, assessment.activity, assessment.rubric_dimension, assessment.rubric, "
    "catalog.lesson, catalog.course_module, catalog.course, identity.app_user, learning.cohort"
)


@pytest.fixture
async def database():  # type: ignore[no-untyped-def]
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))

    async with db.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(text(f"TRUNCATE {TABLES} CASCADE"))

    yield db

    async with db.engine.begin() as connection:
        await connection.execute(text(f"TRUNCATE {TABLES} CASCADE"))
    await db.dispose()


async def seed(database: Database, *, status: str, age_seconds: int, recoveries: int = 0):  # type: ignore[no-untyped-def]
    """A submission with no activity behind it.

    The foreign keys are dropped for this table so the test can focus on the
    claim logic without seeding a whole course tree.
    """
    submission_id = uuid4()
    user_id = uuid4()

    async with database.engine.begin() as connection:
        await connection.execute(
            text("""
                INSERT INTO identity.app_user (id, email, full_name, password_hash, role, is_active)
                VALUES (:uid, :email, 'Docente', 'argon2::fake', 'student', true)
            """),
            {"uid": user_id, "email": f"{user_id}@colegio.edu"},
        )
        await connection.execute(
            text("""
                INSERT INTO assessment.submission
                    (id, activity_id, user_id, prompt, attempt, status, recoveries,
                     created_at, updated_at)
                VALUES
                    (:id, :aid, :uid, 'Armá una guía', 1, :status, :rec,
                     :ts, :ts)
            """),
            {
                "id": submission_id,
                "aid": uuid4(),
                "uid": user_id,
                "status": status,
                "rec": recoveries,
                "ts": NOW - timedelta(seconds=age_seconds),
            },
        )

    return submission_id


@pytest.fixture(autouse=True)
async def no_activity_fk(database: Database):  # type: ignore[no-untyped-def]
    async with database.engine.begin() as connection:
        await connection.execute(
            text(
                "ALTER TABLE assessment.submission "
                "DROP CONSTRAINT IF EXISTS submission_activity_id_fkey"
            )
        )
    yield


class TestClaiming:
    @pytest.mark.asyncio
    async def test_two_replicas_cannot_claim_the_same_submission(self, database: Database) -> None:
        """The reason this file exists.

        Both processes start, both look for abandoned work, and exactly one of
        them may get each row — otherwise the teacher pays for two model calls
        and one result is thrown away.
        """
        stranded = await seed(database, status="running", age_seconds=3600)
        cutoff = NOW - timedelta(seconds=300)

        first, second = await asyncio.gather(
            SqlAlchemySubmissionRepository(database).claim_abandoned(older_than=cutoff, limit=10),
            SqlAlchemySubmissionRepository(database).claim_abandoned(older_than=cutoff, limit=10),
        )

        assert sorted(first + second) == [stranded]

    @pytest.mark.asyncio
    async def test_fresh_work_is_left_to_whoever_is_doing_it(self, database: Database) -> None:
        await seed(database, status="running", age_seconds=5)
        repository = SqlAlchemySubmissionRepository(database)

        claimed = await repository.claim_abandoned(
            older_than=NOW - timedelta(seconds=300), limit=10
        )

        assert claimed == []

    @pytest.mark.asyncio
    async def test_finished_work_is_never_claimed(self, database: Database) -> None:
        await seed(database, status="scored", age_seconds=9999)
        await seed(database, status="failed", age_seconds=9999)
        repository = SqlAlchemySubmissionRepository(database)

        assert (
            await repository.claim_abandoned(older_than=NOW - timedelta(seconds=300), limit=10)
            == []
        )

    @pytest.mark.asyncio
    async def test_a_claim_bumps_the_counter_so_the_budget_is_real(
        self, database: Database
    ) -> None:
        stranded = await seed(database, status="running", age_seconds=3600)
        repository = SqlAlchemySubmissionRepository(database)

        await repository.claim_abandoned(older_than=NOW - timedelta(seconds=300), limit=10)

        async with database.engine.begin() as connection:
            result = await connection.execute(
                text("SELECT recoveries, status FROM assessment.submission WHERE id = :id"),
                {"id": stranded},
            )
            recoveries, status = result.one()

        assert recoveries == 1
        assert status == SubmissionStatus.PENDING.value

    @pytest.mark.asyncio
    async def test_exhausted_submissions_are_reported_not_reclaimed(
        self, database: Database
    ) -> None:
        poisoned = await seed(
            database, status="running", age_seconds=3600, recoveries=MAX_RECOVERIES
        )
        repository = SqlAlchemySubmissionRepository(database)
        cutoff = NOW - timedelta(seconds=300)

        assert await repository.claim_abandoned(older_than=cutoff, limit=10) == []
        assert await repository.claim_exhausted(older_than=cutoff, limit=10) == [poisoned]


class TestAttemptFairness:
    @pytest.mark.asyncio
    async def test_our_failures_are_not_the_teachers_attempts(self, database: Database) -> None:
        """A failed submission only ever means we broke.

        A bad prompt earns a low score, not a failure — so charging an attempt
        for a failure bills the teacher for our outage.
        """
        activity_id = uuid4()
        user_id = uuid4()

        async with database.engine.begin() as connection:
            await connection.execute(
                text("""
                    INSERT INTO identity.app_user (id, email, full_name, password_hash, role, is_active)
                    VALUES (:uid, :email, 'Docente', 'argon2::fake', 'student', true)
                """),
                {"uid": user_id, "email": f"{user_id}@colegio.edu"},
            )
            for attempt, status in enumerate(["scored", "failed", "failed"], start=1):
                await connection.execute(
                    text("""
                        INSERT INTO assessment.submission
                            (id, activity_id, user_id, prompt, attempt, status, recoveries,
                             created_at, updated_at)
                        VALUES (:id, :aid, :uid, 'x', :att, :status, 0, :ts, :ts)
                    """),
                    {
                        "id": uuid4(),
                        "aid": activity_id,
                        "uid": user_id,
                        "att": attempt,
                        "status": status,
                        "ts": NOW,
                    },
                )

        spent = await SqlAlchemySubmissionRepository(database).count_attempts(
            user_id=user_id, activity_id=activity_id
        )

        assert spent == 1
