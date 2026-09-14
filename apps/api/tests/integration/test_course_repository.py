"""Catalog repository against a real PostgreSQL.

These matter more than most: the in-memory repository reimplements the same
ordering, filtering and keyset rules in Python. If the two ever drift, this is
the suite that notices — a fake agreeing with itself proves nothing.
"""

import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.domain.entities import Email
from app.features.auth.domain.entities import User as AuthUser
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.catalog.domain.entities import CatalogFilters, CourseStatus, Level, Slug
from app.features.catalog.domain.errors import InvalidCursorError
from app.features.catalog.infrastructure.models import CourseModel, LessonModel, ModuleModel
from app.features.catalog.infrastructure.sql_repository import SqlAlchemyCourseRepository

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)

BASE_TIME = datetime(2026, 9, 1, 12, 0, tzinfo=UTC)
TABLES = "lesson, course_module, course, app_user, cohort"


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
def repository(database: Database) -> SqlAlchemyCourseRepository:
    return SqlAlchemyCourseRepository(database)


async def seed_course(
    database: Database,
    instructor: AuthUser,
    slug: str,
    *,
    title: str | None = None,
    summary: str = "Ahorra tiempo en tus tareas de clase",
    level: Level = Level.BEGINNER,
    status: CourseStatus = CourseStatus.PUBLISHED,
    days: int = 0,
    lesson_durations: tuple[int, ...] = (),
) -> None:
    published_at = BASE_TIME + timedelta(days=days)

    course = CourseModel(
        id=uuid4(),
        slug=slug,
        title=title or slug.replace("-", " ").capitalize(),
        summary=summary,
        description="Descripción completa del curso",
        level=level.value,
        status=status.value,
        instructor_id=instructor.id,
        created_at=published_at,
        published_at=published_at if status is CourseStatus.PUBLISHED else None,
    )

    if lesson_durations:
        module = ModuleModel(id=uuid4(), title="Módulo 1", position=1)
        module.lessons = [
            LessonModel(
                id=uuid4(),
                title=f"Lección {index}",
                kind="video",
                position=index,
                duration_seconds=duration,
            )
            for index, duration in enumerate(lesson_durations, start=1)
        ]
        course.modules = [module]

    async with database.session() as session:
        session.add(course)


class TestListPublished:
    async def test_returns_published_courses_with_their_instructor(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "ia-basica")

        page = await repository.list_published(filters=CatalogFilters(), limit=10)

        assert [str(item.slug) for item in page.items] == ["ia-basica"]
        assert page.items[0].instructor_name == "Eduardo Calvache"

    @pytest.mark.parametrize("status", [CourseStatus.DRAFT, CourseStatus.ARCHIVED])
    async def test_excludes_courses_that_are_not_published(
        self,
        database: Database,
        instructor: AuthUser,
        repository: SqlAlchemyCourseRepository,
        status: CourseStatus,
    ) -> None:
        await seed_course(database, instructor, "oculto", status=status)

        page = await repository.list_published(filters=CatalogFilters(), limit=10)

        assert page.items == []

    async def test_aggregates_lesson_count_and_duration_in_one_query(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "ia-basica", lesson_durations=(90, 30, 60))

        page = await repository.list_published(filters=CatalogFilters(), limit=10)

        assert page.items[0].lesson_count == 3
        assert page.items[0].duration_seconds == 180

    async def test_a_course_without_lessons_reports_zero_not_null(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        # The outer join produces NULL for a course with no modules at all; the
        # COALESCE is what turns that into a 0 the client can render.
        await seed_course(database, instructor, "vacio")

        page = await repository.list_published(filters=CatalogFilters(), limit=10)

        assert page.items[0].lesson_count == 0
        assert page.items[0].duration_seconds == 0

    async def test_newest_first(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "viejo", days=0)
        await seed_course(database, instructor, "nuevo", days=10)
        await seed_course(database, instructor, "medio", days=5)

        page = await repository.list_published(filters=CatalogFilters(), limit=10)

        assert [str(item.slug) for item in page.items] == ["nuevo", "medio", "viejo"]

    async def test_filters_by_level(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "basico", level=Level.BEGINNER)
        await seed_course(database, instructor, "experto", level=Level.EXPERT)

        page = await repository.list_published(filters=CatalogFilters(level=Level.EXPERT), limit=10)

        assert [str(item.slug) for item in page.items] == ["experto"]

    async def test_search_is_case_insensitive_over_title_and_summary(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "uno", title="Prompting para docentes")
        await seed_course(
            database, instructor, "dos", title="Hojas de cálculo", summary="Otra cosa"
        )

        page = await repository.list_published(filters=CatalogFilters(query="PROMPTING"), limit=10)

        assert [str(item.slug) for item in page.items] == ["uno"]


class TestKeysetPagination:
    async def test_walks_every_course_exactly_once(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        for index in range(5):
            await seed_course(database, instructor, f"curso-{index}", days=index)

        seen: list[str] = []
        cursor: str | None = None
        for _ in range(3):
            page = await repository.list_published(filters=CatalogFilters(), limit=2, cursor=cursor)
            seen.extend(str(item.slug) for item in page.items)
            cursor = page.next_cursor

        assert seen == ["curso-4", "curso-3", "curso-2", "curso-1", "curso-0"]
        assert cursor is None

    async def test_courses_published_in_the_same_instant_still_paginate_cleanly(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        # The id is the tie-break. Without it, two courses sharing a timestamp
        # could be returned twice or skipped entirely.
        for index in range(4):
            await seed_course(database, instructor, f"simultaneo-{index}", days=0)

        seen: list[str] = []
        cursor: str | None = None
        for _ in range(2):
            page = await repository.list_published(filters=CatalogFilters(), limit=2, cursor=cursor)
            seen.extend(str(item.slug) for item in page.items)
            cursor = page.next_cursor

        assert len(seen) == 4
        assert len(set(seen)) == 4

    async def test_the_last_page_carries_no_cursor(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "unico")

        page = await repository.list_published(filters=CatalogFilters(), limit=10)

        assert page.next_cursor is None

    async def test_a_tampered_cursor_is_rejected(
        self, repository: SqlAlchemyCourseRepository
    ) -> None:
        with pytest.raises(InvalidCursorError):
            await repository.list_published(
                filters=CatalogFilters(), limit=10, cursor="no-es-un-cursor!!"
            )


class TestGetPublishedBySlug:
    async def test_loads_the_full_syllabus_in_order(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "ia-basica", lesson_durations=(60, 60, 60))

        course = await repository.get_published_by_slug(Slug("ia-basica"))

        assert course is not None
        assert course.lesson_count == 3
        positions = [lesson.position for lesson in course.ordered_modules[0].ordered_lessons]
        assert positions == [1, 2, 3]

    async def test_returns_none_for_an_unknown_slug(
        self, repository: SqlAlchemyCourseRepository
    ) -> None:
        assert await repository.get_published_by_slug(Slug("no-existe")) is None

    async def test_returns_none_for_a_draft(
        self, database: Database, instructor: AuthUser, repository: SqlAlchemyCourseRepository
    ) -> None:
        await seed_course(database, instructor, "borrador", status=CourseStatus.DRAFT)

        assert await repository.get_published_by_slug(Slug("borrador")) is None
