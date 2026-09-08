from uuid import UUID, uuid4

import pytest

from app.features.catalog.domain.entities import Course, CourseStatus, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.enrollment.application.use_cases import (
    CompleteLesson,
    EnrollInCourse,
    GetCourseProgress,
    ListMyCourses,
)
from app.features.enrollment.domain.errors import (
    AlreadyEnrolledError,
    CohortNotFoundError,
    LessonNotInCourseError,
    NotEnrolledError,
)
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryProgressRepository,
)
from tests.fakes import FrozenClock
from tests.test_catalog_use_cases import make_course

COHORT_ID = uuid4()
COHORT_CODE = "MANTA-SEP-01"


async def load(courses: InMemoryCourseRepository, slug: str) -> Course:
    """Fetch a seeded course so a test can name a real lesson id."""
    course = await courses.get_published_by_slug(Slug(slug))
    assert course is not None
    return course


async def first_lesson_id(courses: InMemoryCourseRepository, slug: str) -> UUID:
    course = await load(courses, slug)
    return course.ordered_modules[0].ordered_lessons[0].id


@pytest.fixture
def teacher() -> object:
    return uuid4()


@pytest.fixture
def courses() -> InMemoryCourseRepository:
    return InMemoryCourseRepository(
        [
            make_course("ia-basica", lessons=3),
            make_course("otro-curso", lessons=2, published_offset_days=1),
            make_course("borrador", status=CourseStatus.DRAFT),
        ]
    )


@pytest.fixture
def enrollments() -> InMemoryEnrollmentRepository:
    return InMemoryEnrollmentRepository()


@pytest.fixture
def progress() -> InMemoryProgressRepository:
    return InMemoryProgressRepository()


@pytest.fixture
def cohorts() -> InMemoryCohortRepository:
    return InMemoryCohortRepository({COHORT_CODE: COHORT_ID})


@pytest.fixture
def enroll(
    courses: InMemoryCourseRepository,
    enrollments: InMemoryEnrollmentRepository,
    cohorts: InMemoryCohortRepository,
) -> EnrollInCourse:
    return EnrollInCourse(
        courses=courses, enrollments=enrollments, cohorts=cohorts, clock=FrozenClock()
    )


class TestEnrollInCourse:
    async def test_creates_the_enrollment(self, enroll: EnrollInCourse, teacher) -> None:  # type: ignore[no-untyped-def]
        enrollment = await enroll.execute(user_id=teacher, slug="ia-basica")

        assert enrollment.user_id == teacher
        assert enrollment.enrolled_at is not None

    async def test_enrolling_twice_is_a_conflict(self, enroll: EnrollInCourse, teacher) -> None:  # type: ignore[no-untyped-def]
        await enroll.execute(user_id=teacher, slug="ia-basica")

        with pytest.raises(AlreadyEnrolledError):
            await enroll.execute(user_id=teacher, slug="ia-basica")

    async def test_two_teachers_can_join_the_same_course(
        self,
        enroll: EnrollInCourse,
    ) -> None:
        await enroll.execute(user_id=uuid4(), slug="ia-basica")
        await enroll.execute(user_id=uuid4(), slug="ia-basica")

    async def test_a_draft_cannot_be_joined(self, enroll: EnrollInCourse, teacher) -> None:  # type: ignore[no-untyped-def]
        # Otherwise the course vanishes from the teacher's panel the moment it
        # is unpublished.
        with pytest.raises(CourseNotFoundError):
            await enroll.execute(user_id=teacher, slug="borrador")

    async def test_an_unknown_course_is_not_found(self, enroll: EnrollInCourse, teacher) -> None:  # type: ignore[no-untyped-def]
        with pytest.raises(CourseNotFoundError):
            await enroll.execute(user_id=teacher, slug="no-existe")


class TestCohortAttribution:
    async def test_a_valid_code_attributes_the_enrollment(
        self,
        enroll: EnrollInCourse,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        enrollment = await enroll.execute(
            user_id=teacher, slug="ia-basica", cohort_code=COHORT_CODE
        )

        assert enrollment.cohort_id == COHORT_ID

    async def test_without_a_code_there_is_no_cohort(
        self,
        enroll: EnrollInCourse,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        # Open enrollment is legitimate: whoever finds the catalog on their own
        # simply has no talk to attribute.
        enrollment = await enroll.execute(user_id=teacher, slug="ia-basica")

        assert enrollment.cohort_id is None

    async def test_an_unknown_code_fails_loudly(
        self,
        enroll: EnrollInCourse,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        # Silently dropping it would enroll the teacher with no attribution,
        # which is exactly what makes the alliance metric meaningless.
        with pytest.raises(CohortNotFoundError):
            await enroll.execute(user_id=teacher, slug="ia-basica", cohort_code="INVENTADO")

    async def test_the_code_is_trimmed(
        self,
        enroll: EnrollInCourse,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        enrollment = await enroll.execute(
            user_id=teacher, slug="ia-basica", cohort_code=f"  {COHORT_CODE}  "
        )

        assert enrollment.cohort_id == COHORT_ID


class TestCompleteLesson:
    async def test_marks_a_lesson_and_returns_the_new_progress(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        await enroll.execute(user_id=teacher, slug="ia-basica")
        first_id = await first_lesson_id(courses, "ia-basica")

        result = await CompleteLesson(
            courses=courses, enrollments=enrollments, progress=progress
        ).execute(user_id=teacher, slug="ia-basica", lesson_id=first_id)

        assert result.completed_lessons == 1
        assert result.percentage == 33

    async def test_marking_the_same_lesson_twice_is_idempotent(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        # A flaky connection retrying must not be punished.
        await enroll.execute(user_id=teacher, slug="ia-basica")
        first_id = await first_lesson_id(courses, "ia-basica")
        complete = CompleteLesson(courses=courses, enrollments=enrollments, progress=progress)

        await complete.execute(user_id=teacher, slug="ia-basica", lesson_id=first_id)
        result = await complete.execute(user_id=teacher, slug="ia-basica", lesson_id=first_id)

        assert result.completed_lessons == 1

    async def test_a_lesson_from_another_course_is_rejected(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        # Without the check, any lesson id would be accepted and quietly inflate
        # the teacher's progress.
        await enroll.execute(user_id=teacher, slug="ia-basica")
        foreign_id = await first_lesson_id(courses, "otro-curso")

        with pytest.raises(LessonNotInCourseError):
            await CompleteLesson(
                courses=courses, enrollments=enrollments, progress=progress
            ).execute(user_id=teacher, slug="ia-basica", lesson_id=foreign_id)

    async def test_progress_without_enrolling_is_refused(
        self,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        first_id = await first_lesson_id(courses, "ia-basica")

        with pytest.raises(NotEnrolledError):
            await CompleteLesson(
                courses=courses, enrollments=enrollments, progress=progress
            ).execute(user_id=teacher, slug="ia-basica", lesson_id=first_id)

    async def test_one_teachers_progress_does_not_touch_another(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
    ) -> None:
        ana, luis = uuid4(), uuid4()
        await enroll.execute(user_id=ana, slug="ia-basica")
        await enroll.execute(user_id=luis, slug="ia-basica")
        first_id = await first_lesson_id(courses, "ia-basica")

        await CompleteLesson(courses=courses, enrollments=enrollments, progress=progress).execute(
            user_id=ana, slug="ia-basica", lesson_id=first_id
        )

        luis_progress = await GetCourseProgress(
            courses=courses, enrollments=enrollments, progress=progress
        ).execute(user_id=luis, slug="ia-basica")

        assert luis_progress.completed_lessons == 0


class TestGetCourseProgress:
    async def test_reports_the_resume_point(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        await enroll.execute(user_id=teacher, slug="ia-basica")
        course = await load(courses, "ia-basica")
        lessons = course.ordered_modules[0].ordered_lessons
        await CompleteLesson(courses=courses, enrollments=enrollments, progress=progress).execute(
            user_id=teacher, slug="ia-basica", lesson_id=lessons[0].id
        )

        result = await GetCourseProgress(
            courses=courses, enrollments=enrollments, progress=progress
        ).execute(user_id=teacher, slug="ia-basica")

        assert result.next_lesson is not None
        assert result.next_lesson.lesson_id == lessons[1].id

    async def test_refuses_a_course_the_teacher_never_joined(
        self,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        with pytest.raises(NotEnrolledError):
            await GetCourseProgress(
                courses=courses, enrollments=enrollments, progress=progress
            ).execute(user_id=teacher, slug="ia-basica")


class TestListMyCourses:
    async def test_is_empty_before_enrolling(
        self,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        result = await ListMyCourses(
            courses=courses, enrollments=enrollments, progress=progress
        ).execute(user_id=teacher)

        assert result == []

    async def test_lists_every_joined_course_with_its_progress(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
        teacher,  # type: ignore[no-untyped-def]
    ) -> None:
        await enroll.execute(user_id=teacher, slug="ia-basica")
        await enroll.execute(user_id=teacher, slug="otro-curso")
        first_id = await first_lesson_id(courses, "ia-basica")
        await CompleteLesson(courses=courses, enrollments=enrollments, progress=progress).execute(
            user_id=teacher, slug="ia-basica", lesson_id=first_id
        )

        result = await ListMyCourses(
            courses=courses, enrollments=enrollments, progress=progress
        ).execute(user_id=teacher)

        by_slug = {str(item.course.slug): item for item in result}
        assert by_slug["ia-basica"].progress.percentage == 33
        assert by_slug["otro-curso"].progress.percentage == 0

    async def test_shows_only_the_callers_own_courses(
        self,
        enroll: EnrollInCourse,
        courses: InMemoryCourseRepository,
        enrollments: InMemoryEnrollmentRepository,
        progress: InMemoryProgressRepository,
    ) -> None:
        ana, luis = uuid4(), uuid4()
        await enroll.execute(user_id=ana, slug="ia-basica")

        result = await ListMyCourses(
            courses=courses, enrollments=enrollments, progress=progress
        ).execute(user_id=luis)

        assert result == []
