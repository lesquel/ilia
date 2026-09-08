from uuid import uuid4

import pytest

from app.features.catalog.domain.entities import (
    Course,
    CourseStatus,
    Lesson,
    LessonKind,
    Level,
    Module,
    Page,
    Slug,
)


def lesson(position: int, duration: int = 60) -> Lesson:
    return Lesson(
        id=uuid4(),
        title=f"Lección {position}",
        kind=LessonKind.TEXT,
        position=position,
        duration_seconds=duration,
    )


def course(status: CourseStatus = CourseStatus.PUBLISHED, modules: list[Module] | None = None):  # type: ignore[no-untyped-def]
    return Course(
        id=uuid4(),
        slug=Slug("prompting-para-docentes"),
        title="Prompting para docentes",
        summary="Ahorrá tiempo en tus tareas de clase",
        description="Curso completo",
        level=Level.BEGINNER,
        status=status,
        instructor_id=uuid4(),
        instructor_name="Eduardo Calvache",
        modules=modules or [],
    )


class TestSlug:
    def test_is_normalized(self) -> None:
        assert Slug("  Prompting-Para-Docentes  ") == Slug("prompting-para-docentes")

    @pytest.mark.parametrize("value", ["", "   ", "con espacios", "con/barra", "acentué"])
    def test_rejects_anything_that_is_not_url_safe(self, value: str) -> None:
        with pytest.raises(ValueError):
            Slug(value)

    def test_accepts_letters_digits_and_hyphens(self) -> None:
        assert str(Slug("ia-basica-2026")) == "ia-basica-2026"


class TestCatalogVisibility:
    def test_only_published_courses_are_visible(self) -> None:
        assert course(CourseStatus.PUBLISHED).is_visible_in_catalog

    @pytest.mark.parametrize("status", [CourseStatus.DRAFT, CourseStatus.ARCHIVED])
    def test_drafts_and_archived_courses_are_not(self, status: CourseStatus) -> None:
        assert not course(status).is_visible_in_catalog


class TestSyllabusOrdering:
    def test_modules_come_back_in_position_order(self) -> None:
        target = course(
            modules=[
                Module(id=uuid4(), title="Segundo", position=2),
                Module(id=uuid4(), title="Primero", position=1),
            ]
        )

        assert [module.title for module in target.ordered_modules] == ["Primero", "Segundo"]

    def test_lessons_come_back_in_position_order(self) -> None:
        module = Module(
            id=uuid4(), title="M", position=1, lessons=[lesson(3), lesson(1), lesson(2)]
        )

        assert [item.position for item in module.ordered_lessons] == [1, 2, 3]


class TestDerivedTotals:
    def test_duration_is_summed_from_the_lessons(self) -> None:
        # Derived and never stored: a denormalized column drifts the moment
        # somebody edits a lesson, and a catalog that lies about how long a
        # course takes loses the teacher on day one.
        target = course(
            modules=[
                Module(id=uuid4(), title="A", position=1, lessons=[lesson(1, 90), lesson(2, 30)]),
                Module(id=uuid4(), title="B", position=2, lessons=[lesson(1, 60)]),
            ]
        )

        assert target.duration_seconds == 180

    def test_lesson_count_spans_every_module(self) -> None:
        target = course(
            modules=[
                Module(id=uuid4(), title="A", position=1, lessons=[lesson(1), lesson(2)]),
                Module(id=uuid4(), title="B", position=2, lessons=[lesson(1)]),
            ]
        )

        assert target.lesson_count == 3

    def test_a_course_with_no_lessons_lasts_zero(self) -> None:
        assert course().duration_seconds == 0
        assert course().lesson_count == 0


class TestPage:
    def test_a_cursor_means_there_is_more(self) -> None:
        assert Page(items=[], next_cursor="abc").has_more

    def test_no_cursor_means_the_last_page(self) -> None:
        assert not Page(items=[]).has_more
