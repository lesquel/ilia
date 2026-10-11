"""Enrollment and progress against a real PostgreSQL.

The constraints tested here are the ones the in-memory repository can only
imitate: a unique index that survives a race, and an idempotent upsert.
"""

import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.domain.entities import Email
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.models import CohortModel
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.catalog.domain.entities import CourseStatus, Level
from app.features.enrollment.domain.entities import Cohort, Enrollment
from app.features.enrollment.domain.errors import AlreadyEnrolledError, CohortCodeTakenError
from app.features.enrollment.infrastructure.sql_repository import (
    SqlAlchemyCohortRepository,
    SqlAlchemyEnrollmentRepository,
    SqlAlchemyProgressRepository,
)
from tests.integration.test_course_repository import TABLES as CATALOG_TABLES
from tests.integration.test_course_repository import seed_course

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)

TABLES = f"learning.lesson_progress, learning.enrollment, {CATALOG_TABLES}, learning.cohort"


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


@pytest.fixture
async def instructor(database: Database) -> AuthUser:
    user = AuthUser.register(
        email=Email("eduardo@manta.gob.ec"),
        full_name="Eduardo Calvache",
        password_hash="argon2::fake",
    )
    await SqlAlchemyUserRepository(database).add(user)
    return user


@pytest.fixture
async def teacher(database: Database) -> AuthUser:
    user = AuthUser.register(
        email=Email("ana@colegio.edu"),
        full_name="Ana Pérez",
        password_hash="argon2::fake",
    )
    await SqlAlchemyUserRepository(database).add(user)
    return user


@pytest.fixture
def enrollments(database: Database) -> SqlAlchemyEnrollmentRepository:
    return SqlAlchemyEnrollmentRepository(database)


@pytest.fixture
def progress(database: Database) -> SqlAlchemyProgressRepository:
    return SqlAlchemyProgressRepository(database)


async def make_enrollment(
    repository: SqlAlchemyEnrollmentRepository,
    *,
    user_id,  # type: ignore[no-untyped-def]
    course_id,  # type: ignore[no-untyped-def]
    cohort_id=None,  # type: ignore[no-untyped-def]
) -> Enrollment:
    enrollment = Enrollment.create(
        user_id=user_id,
        course_id=course_id,
        enrolled_at=datetime.now(UTC),
        cohort_id=cohort_id,
    )
    await repository.add(enrollment)
    return enrollment


async def seeded_course(database: Database, instructor: AuthUser):  # type: ignore[no-untyped-def]
    from app.features.catalog.domain.entities import Slug
    from app.features.catalog.infrastructure.sql_repository import SqlAlchemyCourseRepository

    await seed_course(
        database,
        instructor,
        "ia-basica",
        level=Level.BEGINNER,
        status=CourseStatus.PUBLISHED,
        lesson_durations=(60, 60, 60),
    )
    course = await SqlAlchemyCourseRepository(database).get_published_by_slug(Slug("ia-basica"))
    assert course is not None
    return course


async def seed_activity_with_attempts(
    database: Database,
    instructor: AuthUser,
    teacher: AuthUser,
    *,
    passed_on: list[bool],
    for_other_user: bool = False,
    model: str = "fake",
):  # type: ignore[no-untyped-def]
    """A course with one activity and a series of graded attempts.

    Written with raw SQL rather than through the repositories: the point is what
    the query reads back, and building it through four features' use cases would
    test those instead.
    """
    course = await seeded_course(database, instructor)

    author = uuid4() if for_other_user else teacher.id
    rubric_id, activity_id = uuid4(), uuid4()
    module_id = course.modules[0].id

    async with database.engine.begin() as connection:
        if for_other_user:
            await connection.execute(
                text("""
                    INSERT INTO auth.app_user (id, email, full_name, password_hash, role, is_active)
                    VALUES (:id, :email, 'Otra', 'argon2::fake', 'student', true)
                """),
                {"id": author, "email": f"{author}@colegio.edu"},
            )

        await connection.execute(
            text("INSERT INTO assessment.rubric (id, version, name) VALUES (:id, 1, 'R')"),
            {"id": rubric_id},
        )
        await connection.execute(
            text("""
                INSERT INTO assessment.activity
                    (id, module_id, course_id, rubric_id, title, statement, max_attempts, checks)
                VALUES (:id, :module_id, :course_id, :rubric_id, 'Actividad', 'Enunciado', 3, '{}')
            """),
            {
                "id": activity_id,
                "module_id": module_id,
                "course_id": course.id,
                "rubric_id": rubric_id,
            },
        )

        for attempt, passed in enumerate(passed_on, start=1):
            submission_id = uuid4()
            await connection.execute(
                text("""
                    INSERT INTO assessment.submission
                        (id, activity_id, user_id, prompt, attempt, status, recoveries)
                    VALUES (:id, :activity_id, :user_id, 'x', :attempt, 'scored', 0)
                """),
                {
                    "id": submission_id,
                    "activity_id": activity_id,
                    "user_id": author,
                    "attempt": attempt,
                },
            )
            await connection.execute(
                text("""
                    INSERT INTO assessment.evaluation
                        (id, submission_id, rubric_version, total, passed, model, model_version)
                    VALUES (:id, :submission_id, 1, 80, :passed, :model, '1')
                """),
                {
                    "id": uuid4(),
                    "submission_id": submission_id,
                    "passed": passed,
                    "model": model,
                },
            )

    return teacher.id, course.id, activity_id


class TestEnrollmentRepository:
    async def test_stores_and_reads_back(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
    ) -> None:
        course = await seeded_course(database, instructor)

        created = await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)
        found = await enrollments.get(user_id=teacher.id, course_id=course.id)

        assert found is not None
        assert found.id == created.id
        assert found.enrolled_at is not None

    async def test_the_unique_constraint_is_what_stops_a_double_enrollment(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
    ) -> None:
        # Two taps on a slow connection both pass the application's check.
        course = await seeded_course(database, instructor)
        await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)

        with pytest.raises(AlreadyEnrolledError):
            await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)

    async def test_records_the_cohort(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
    ) -> None:
        course = await seeded_course(database, instructor)
        cohort_id = uuid4()
        async with database.session() as session:
            session.add(
                CohortModel(id=cohort_id, name="Charla Manta septiembre", code="MANTA-SEP-01")
            )

        await make_enrollment(
            enrollments, user_id=teacher.id, course_id=course.id, cohort_id=cohort_id
        )

        found = await enrollments.get(user_id=teacher.id, course_id=course.id)
        assert found is not None
        assert found.cohort_id == cohort_id

    async def test_lists_only_the_owners_enrollments(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
    ) -> None:
        course = await seeded_course(database, instructor)
        other = AuthUser.register(
            email=Email("luis@colegio.edu"), full_name="Luis", password_hash="argon2::fake"
        )
        await SqlAlchemyUserRepository(database).add(other)

        await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)

        assert len(await enrollments.list_for_user(teacher.id)) == 1
        assert await enrollments.list_for_user(other.id) == []


class TestProgressRepository:
    async def test_marks_a_lesson_completed(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
        progress: SqlAlchemyProgressRepository,
    ) -> None:
        course = await seeded_course(database, instructor)
        enrollment = await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)
        lesson = course.ordered_modules[0].ordered_lessons[0]

        await progress.mark_completed(enrollment_id=enrollment.id, course_id=course.id, lesson_id=lesson.id)

        assert await progress.completed_lesson_ids(enrollment.id) == {lesson.id}

    async def test_marking_twice_is_idempotent_at_the_database_level(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
        progress: SqlAlchemyProgressRepository,
    ) -> None:
        # ON CONFLICT DO NOTHING: one round trip, and immune to a retry racing
        # with the original request.
        course = await seeded_course(database, instructor)
        enrollment = await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)
        lesson = course.ordered_modules[0].ordered_lessons[0]

        await progress.mark_completed(enrollment_id=enrollment.id, course_id=course.id, lesson_id=lesson.id)
        await progress.mark_completed(enrollment_id=enrollment.id, course_id=course.id, lesson_id=lesson.id)

        assert len(await progress.completed_lesson_ids(enrollment.id)) == 1

    async def test_reads_several_enrollments_in_one_query(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
        progress: SqlAlchemyProgressRepository,
    ) -> None:
        # This is what keeps "Mis cursos" from being an N+1.
        first = await seeded_course(database, instructor)
        await seed_course(database, instructor, "otro-curso", lesson_durations=(60,))
        from app.features.catalog.domain.entities import Slug
        from app.features.catalog.infrastructure.sql_repository import (
            SqlAlchemyCourseRepository,
        )

        second = await SqlAlchemyCourseRepository(database).get_published_by_slug(
            Slug("otro-curso")
        )
        assert second is not None

        one = await make_enrollment(enrollments, user_id=teacher.id, course_id=first.id)
        two = await make_enrollment(enrollments, user_id=teacher.id, course_id=second.id)
        await progress.mark_completed(
            enrollment_id=one.id, course_id=first.id, lesson_id=first.ordered_modules[0].ordered_lessons[0].id
        )

        completions = await progress.completed_by_enrollment([one.id, two.id])

        assert len(completions[one.id]) == 1
        assert two.id not in completions

    async def test_an_empty_list_asks_the_database_nothing(
        self, progress: SqlAlchemyProgressRepository
    ) -> None:
        assert await progress.completed_by_enrollment([]) == {}

    async def test_progress_is_isolated_per_enrollment(
        self,
        database: Database,
        instructor: AuthUser,
        teacher: AuthUser,
        enrollments: SqlAlchemyEnrollmentRepository,
        progress: SqlAlchemyProgressRepository,
    ) -> None:
        course = await seeded_course(database, instructor)
        other = AuthUser.register(
            email=Email("luis@colegio.edu"), full_name="Luis", password_hash="argon2::fake"
        )
        await SqlAlchemyUserRepository(database).add(other)

        ana = await make_enrollment(enrollments, user_id=teacher.id, course_id=course.id)
        luis = await make_enrollment(enrollments, user_id=other.id, course_id=course.id)
        await progress.mark_completed(
            enrollment_id=ana.id, course_id=course.id, lesson_id=course.ordered_modules[0].ordered_lessons[0].id
        )

        assert await progress.completed_lesson_ids(luis.id) == set()


class TestCohortRepository:
    async def test_finds_a_cohort_by_its_code(self, database: Database) -> None:
        cohort_id = uuid4()
        async with database.session() as session:
            session.add(CohortModel(id=cohort_id, name="Charla Manta", code="MANTA-SEP-01"))

        assert await SqlAlchemyCohortRepository(database).id_for_code("MANTA-SEP-01") == cohort_id

    async def test_returns_none_for_an_unknown_code(self, database: Database) -> None:
        assert await SqlAlchemyCohortRepository(database).id_for_code("INVENTADO") is None

    async def test_add_and_list_show_code_and_name(self, database: Database) -> None:
        repo = SqlAlchemyCohortRepository(database)
        cohort = Cohort.create(
            name="Charla Manta — septiembre 2026",
            code="MANTA-SEP-01",
            created_at=datetime.now(UTC),
        )
        await repo.add(cohort)

        items = await repo.list_all()

        assert [(item.code, item.name) for item in items] == [
            ("MANTA-SEP-01", "Charla Manta — septiembre 2026")
        ]

    async def test_a_duplicate_code_is_a_conflict(self, database: Database) -> None:
        repo = SqlAlchemyCohortRepository(database)
        first = Cohort.create(name="Primera", code="MANTA-SEP-01", created_at=datetime.now(UTC))
        second = Cohort.create(name="Segunda", code="MANTA-SEP-01", created_at=datetime.now(UTC))
        await repo.add(first)

        with pytest.raises(CohortCodeTakenError):
            await repo.add(second)


class TestPassedActivities:
    """Which activities the syllabus may mark as done.

    The rule is deliberately the same one the certificate criteria use: a
    syllabus that marked an activity passed and a certificate that said it was
    not would be two answers to the same question.
    """

    @pytest.mark.asyncio
    async def test_an_activity_counts_once_it_has_been_passed_by_any_attempt(
        self, database: Database, instructor: AuthUser, teacher: AuthUser
    ) -> None:
        # A teacher who failed twice and got it right on the third has learned
        # it, which is the point of allowing retries.
        user_id, course_id, activity_id = await seed_activity_with_attempts(
            database, instructor, teacher, passed_on=[False, False, True]
        )

        passed = await SqlAlchemyProgressRepository(database).passed_activity_ids(
            user_id=user_id, course_id=course_id
        )

        assert passed == {activity_id}

    @pytest.mark.asyncio
    async def test_failed_attempts_alone_do_not_count(
        self, database: Database, instructor: AuthUser, teacher: AuthUser
    ) -> None:
        user_id, course_id, _ = await seed_activity_with_attempts(
            database, instructor, teacher, passed_on=[False, False]
        )

        passed = await SqlAlchemyProgressRepository(database).passed_activity_ids(
            user_id=user_id, course_id=course_id
        )

        assert passed == set()

    @pytest.mark.asyncio
    async def test_another_teachers_pass_is_not_yours(
        self, database: Database, instructor: AuthUser, teacher: AuthUser
    ) -> None:
        user_id, course_id, _ = await seed_activity_with_attempts(
            database, instructor, teacher, passed_on=[True], for_other_user=True
        )

        passed = await SqlAlchemyProgressRepository(database).passed_activity_ids(
            user_id=user_id, course_id=course_id
        )

        assert passed == set()

    @pytest.mark.asyncio
    async def test_a_stub_pass_does_not_mark_the_activity_done(
        self, database: Database, instructor: AuthUser, teacher: AuthUser
    ) -> None:
        from app.features.evaluation.infrastructure.local_provider import MODEL_NAME

        user_id, course_id, _ = await seed_activity_with_attempts(
            database,
            instructor,
            teacher,
            passed_on=[True],
            model=MODEL_NAME,
        )

        passed = await SqlAlchemyProgressRepository(database).passed_activity_ids(
            user_id=user_id, course_id=course_id
        )

        assert passed == set()

    @pytest.mark.asyncio
    async def test_a_real_provider_pass_marks_the_activity_done(
        self, database: Database, instructor: AuthUser, teacher: AuthUser
    ) -> None:
        user_id, course_id, activity_id = await seed_activity_with_attempts(
            database, instructor, teacher, passed_on=[True], model="gpt-4o-mini"
        )

        passed = await SqlAlchemyProgressRepository(database).passed_activity_ids(
            user_id=user_id, course_id=course_id
        )

        assert passed == {activity_id}
