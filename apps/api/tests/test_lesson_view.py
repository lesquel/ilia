"""The lesson reader.

Two things matter here: the material is gated behind enrollment, and navigation
follows the syllabus across module boundaries.
"""

from uuid import uuid4

import pytest

from app.features.catalog.domain.entities import Slug
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.enrollment.application.use_cases import EnrollInCourse, GetLesson
from app.features.enrollment.domain.entities import neighbours, syllabus_order
from app.features.enrollment.domain.errors import LessonNotInCourseError, NotEnrolledError
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryLessonContentRepository,
    InMemoryProgressRepository,
)
from tests.fakes import FrozenClock
from tests.test_catalog_use_cases import make_course

TEACHER = uuid4()


@pytest.fixture
def courses() -> InMemoryCourseRepository:
    # 3 lessons in one module, so ordering questions still have an answer.
    return InMemoryCourseRepository([make_course("ia-basica", lessons=3)])


@pytest.fixture
def enrollments() -> InMemoryEnrollmentRepository:
    return InMemoryEnrollmentRepository()


@pytest.fixture
def progress() -> InMemoryProgressRepository:
    return InMemoryProgressRepository()


@pytest.fixture
def contents() -> InMemoryLessonContentRepository:
    return InMemoryLessonContentRepository()


@pytest.fixture
def get_lesson(
    courses: InMemoryCourseRepository,
    enrollments: InMemoryEnrollmentRepository,
    progress: InMemoryProgressRepository,
    contents: InMemoryLessonContentRepository,
) -> GetLesson:
    return GetLesson(courses=courses, enrollments=enrollments, progress=progress, contents=contents)


async def enrol(
    courses: InMemoryCourseRepository, enrollments: InMemoryEnrollmentRepository
) -> None:
    await EnrollInCourse(
        courses=courses,
        enrollments=enrollments,
        cohorts=InMemoryCohortRepository(),
        clock=FrozenClock(),
    ).execute(user_id=TEACHER, slug="ia-basica")


async def lesson_ids(courses: InMemoryCourseRepository) -> list:  # type: ignore[type-arg]
    course = await courses.get_published_by_slug(Slug("ia-basica"))
    assert course is not None
    return [ref.lesson_id for ref in syllabus_order(course)]


class TestNeighbours:
    async def test_navigation_crosses_module_boundaries(
        self, courses: InMemoryCourseRepository
    ) -> None:
        # The last lesson of a module is followed by the first of the next one,
        # not by nothing.
        course = await courses.get_published_by_slug(Slug("ia-basica"))
        assert course is not None
        order = syllabus_order(course)

        previous, following, position = neighbours(course, order[1].lesson_id)

        assert previous is not None and previous.lesson_id == order[0].lesson_id
        assert following is not None and following.lesson_id == order[2].lesson_id
        assert position == 2

    async def test_the_first_lesson_has_no_previous(
        self, courses: InMemoryCourseRepository
    ) -> None:
        course = await courses.get_published_by_slug(Slug("ia-basica"))
        assert course is not None
        order = syllabus_order(course)

        previous, _, position = neighbours(course, order[0].lesson_id)

        assert previous is None
        assert position == 1

    async def test_the_last_lesson_has_no_next(self, courses: InMemoryCourseRepository) -> None:
        course = await courses.get_published_by_slug(Slug("ia-basica"))
        assert course is not None
        order = syllabus_order(course)

        _, following, _ = neighbours(course, order[-1].lesson_id)

        assert following is None


class TestGetLesson:
    async def test_returns_the_material(
        self,
        get_lesson: GetLesson,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        contents: InMemoryLessonContentRepository,
    ) -> None:
        await enrol(courses, enrollments)
        ids = await lesson_ids(courses)
        contents.set_content(ids[0], "Un prompt tiene rol, contexto y formato.")

        view = await get_lesson.execute(user_id=TEACHER, slug="ia-basica", lesson_id=ids[0])

        assert view.content.body.startswith("Un prompt tiene")
        assert view.position == 1
        assert view.total_lessons == 3

    async def test_carries_its_neighbours(
        self,
        get_lesson: GetLesson,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
    ) -> None:
        # So the reader can move without a second round trip.
        await enrol(courses, enrollments)
        ids = await lesson_ids(courses)

        view = await get_lesson.execute(user_id=TEACHER, slug="ia-basica", lesson_id=ids[1])

        assert view.previous is not None
        assert view.next is not None

    async def test_reports_whether_it_is_already_done(
        self,
        get_lesson: GetLesson,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
    ) -> None:
        await enrol(courses, enrollments)
        ids = await lesson_ids(courses)
        enrollment = await enrollments.list_for_user(TEACHER)
        await progress.mark_completed(enrollment_id=enrollment[0].id, lesson_id=ids[0])

        view = await get_lesson.execute(user_id=TEACHER, slug="ia-basica", lesson_id=ids[0])

        assert view.is_completed

    async def test_a_lesson_with_no_material_yet_is_empty_not_an_error(
        self,
        get_lesson: GetLesson,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
    ) -> None:
        # An instructor who created the lesson but has not written it yet must
        # not crash the reader.
        await enrol(courses, enrollments)
        ids = await lesson_ids(courses)

        view = await get_lesson.execute(user_id=TEACHER, slug="ia-basica", lesson_id=ids[0])

        assert view.content.body == ""

    async def test_the_material_is_gated_behind_enrollment(
        self, get_lesson: GetLesson, courses: InMemoryCourseRepository
    ) -> None:
        # The syllabus is public; the material is not. This is the gate.
        ids = await lesson_ids(courses)

        with pytest.raises(NotEnrolledError):
            await get_lesson.execute(user_id=TEACHER, slug="ia-basica", lesson_id=ids[0])

    async def test_a_lesson_from_another_course_is_not_found(
        self,
        get_lesson: GetLesson,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
    ) -> None:
        await enrol(courses, enrollments)

        with pytest.raises(LessonNotInCourseError):
            await get_lesson.execute(user_id=TEACHER, slug="ia-basica", lesson_id=uuid4())
