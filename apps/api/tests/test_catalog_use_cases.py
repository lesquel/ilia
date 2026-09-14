from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.features.catalog.application.use_cases import (
    MAX_PAGE_SIZE,
    BrowseCatalog,
    GetCourseDetail,
)
from app.features.catalog.domain.entities import (
    Course,
    CourseStatus,
    Lesson,
    LessonKind,
    Level,
    Module,
    Slug,
)
from app.features.catalog.domain.errors import CourseNotFoundError, InvalidCursorError
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository

BASE_TIME = datetime(2026, 9, 1, 12, 0, tzinfo=UTC)


def make_course(
    slug: str,
    *,
    title: str | None = None,
    summary: str = "Ahorra tiempo en tus tareas de clase",
    level: Level = Level.BEGINNER,
    status: CourseStatus = CourseStatus.PUBLISHED,
    published_offset_days: int = 0,
    lessons: int = 0,
) -> Course:
    modules = []
    if lessons:
        modules = [
            Module(
                id=uuid4(),
                title="Módulo 1",
                position=1,
                lessons=[
                    Lesson(
                        id=uuid4(),
                        title=f"Lección {index}",
                        kind=LessonKind.VIDEO,
                        position=index,
                        duration_seconds=120,
                    )
                    for index in range(1, lessons + 1)
                ],
            )
        ]

    published_at = BASE_TIME + timedelta(days=published_offset_days)

    return Course(
        id=uuid4(),
        slug=Slug(slug),
        title=title or slug.replace("-", " ").capitalize(),
        summary=summary,
        description="Descripción completa",
        level=level,
        status=status,
        instructor_id=uuid4(),
        instructor_name="Eduardo Calvache",
        created_at=published_at,
        published_at=published_at if status is CourseStatus.PUBLISHED else None,
        modules=modules,
    )


class TestBrowseCatalog:
    async def test_returns_published_courses(self) -> None:
        repository = InMemoryCourseRepository([make_course("ia-basica")])

        page = await BrowseCatalog(courses=repository).execute()

        assert [str(item.slug) for item in page.items] == ["ia-basica"]

    @pytest.mark.parametrize("status", [CourseStatus.DRAFT, CourseStatus.ARCHIVED])
    async def test_hides_courses_that_are_not_published(self, status: CourseStatus) -> None:
        repository = InMemoryCourseRepository([make_course("borrador", status=status)])

        page = await BrowseCatalog(courses=repository).execute()

        assert page.items == []

    async def test_newest_first(self) -> None:
        repository = InMemoryCourseRepository(
            [
                make_course("viejo", published_offset_days=0),
                make_course("nuevo", published_offset_days=10),
                make_course("medio", published_offset_days=5),
            ]
        )

        page = await BrowseCatalog(courses=repository).execute()

        assert [str(item.slug) for item in page.items] == ["nuevo", "medio", "viejo"]

    async def test_filters_by_level(self) -> None:
        repository = InMemoryCourseRepository(
            [
                make_course("basico", level=Level.BEGINNER),
                make_course("experto", level=Level.EXPERT),
            ]
        )

        page = await BrowseCatalog(courses=repository).execute(level=Level.EXPERT)

        assert [str(item.slug) for item in page.items] == ["experto"]

    async def test_searches_title_and_summary_case_insensitively(self) -> None:
        repository = InMemoryCourseRepository(
            [
                make_course("uno", title="Prompting para docentes"),
                make_course("dos", title="Hojas de cálculo", summary="Nada que ver"),
            ]
        )

        page = await BrowseCatalog(courses=repository).execute(query="PROMPTING")

        assert [str(item.slug) for item in page.items] == ["uno"]

    async def test_a_blank_query_is_not_a_filter(self) -> None:
        repository = InMemoryCourseRepository([make_course("uno"), make_course("dos")])

        page = await BrowseCatalog(courses=repository).execute(query="   ")

        assert len(page.items) == 2

    async def test_reports_the_lesson_count_and_duration(self) -> None:
        repository = InMemoryCourseRepository([make_course("ia-basica", lessons=3)])

        page = await BrowseCatalog(courses=repository).execute()

        assert page.items[0].lesson_count == 3
        assert page.items[0].duration_seconds == 360


class TestPagination:
    async def test_the_first_page_reports_there_is_more(self) -> None:
        repository = InMemoryCourseRepository(
            [make_course(f"curso-{index}", published_offset_days=index) for index in range(5)]
        )

        page = await BrowseCatalog(courses=repository).execute(limit=2)

        assert len(page.items) == 2
        assert page.has_more

    async def test_the_cursor_continues_without_repeating_or_skipping(self) -> None:
        repository = InMemoryCourseRepository(
            [make_course(f"curso-{index}", published_offset_days=index) for index in range(5)]
        )
        browse = BrowseCatalog(courses=repository)

        seen: list[str] = []
        cursor: str | None = None
        for _ in range(3):
            page = await browse.execute(limit=2, cursor=cursor)
            seen.extend(str(item.slug) for item in page.items)
            cursor = page.next_cursor

        assert seen == ["curso-4", "curso-3", "curso-2", "curso-1", "curso-0"]
        assert len(seen) == len(set(seen))
        assert cursor is None

    async def test_the_last_page_carries_no_cursor(self) -> None:
        repository = InMemoryCourseRepository([make_course("uno")])

        page = await BrowseCatalog(courses=repository).execute(limit=10)

        assert not page.has_more

    async def test_an_oversized_limit_is_clamped_not_rejected(self) -> None:
        # A client asking for ten thousand courses is a bug or an abuse. Either
        # way the catalog keeps working instead of making the database do
        # unbounded work.
        repository = InMemoryCourseRepository(
            [make_course(f"curso-{index}", published_offset_days=index) for index in range(60)]
        )

        page = await BrowseCatalog(courses=repository).execute(limit=10_000)

        assert len(page.items) == MAX_PAGE_SIZE

    async def test_a_garbage_cursor_is_rejected(self) -> None:
        repository = InMemoryCourseRepository([make_course("uno")])

        with pytest.raises(InvalidCursorError):
            await BrowseCatalog(courses=repository).execute(cursor="no-es-un-cursor!!")


class TestGetCourseDetail:
    async def test_returns_the_full_syllabus(self) -> None:
        repository = InMemoryCourseRepository([make_course("ia-basica", lessons=2)])

        course = await GetCourseDetail(courses=repository).execute(slug="ia-basica")

        assert course.lesson_count == 2
        assert course.ordered_modules[0].title == "Módulo 1"

    async def test_the_slug_lookup_is_case_insensitive(self) -> None:
        repository = InMemoryCourseRepository([make_course("ia-basica")])

        course = await GetCourseDetail(courses=repository).execute(slug="IA-Basica")

        assert str(course.slug) == "ia-basica"

    async def test_an_unknown_slug_is_not_found(self) -> None:
        repository = InMemoryCourseRepository([])

        with pytest.raises(CourseNotFoundError):
            await GetCourseDetail(courses=repository).execute(slug="no-existe")

    async def test_a_draft_answers_exactly_like_a_missing_course(self) -> None:
        # Otherwise the detail endpoint becomes a way to enumerate unpublished
        # work in progress by probing slugs.
        repository = InMemoryCourseRepository([make_course("secreto", status=CourseStatus.DRAFT)])

        with pytest.raises(CourseNotFoundError) as draft:
            await GetCourseDetail(courses=repository).execute(slug="secreto")

        assert draft.value.code == "course_not_found"

    async def test_a_malformed_slug_is_a_miss_not_a_validation_error(self) -> None:
        repository = InMemoryCourseRepository([])

        with pytest.raises(CourseNotFoundError):
            await GetCourseDetail(courses=repository).execute(slug="con espacios")
