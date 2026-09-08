"""Enrollment and progress use cases."""

from uuid import UUID

from app.features.auth.domain.ports import Clock
from app.features.catalog.domain.entities import Course, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.domain.ports import CourseRepository
from app.features.enrollment.domain.entities import (
    CourseProgress,
    EnrolledCourse,
    Enrollment,
    compute_progress,
    find_lesson,
)
from app.features.enrollment.domain.errors import (
    AlreadyEnrolledError,
    CohortNotFoundError,
    LessonNotInCourseError,
    NotEnrolledError,
)
from app.features.enrollment.domain.ports import (
    CohortRepository,
    EnrollmentRepository,
    ProgressRepository,
)


async def _published_course(courses: CourseRepository, slug: str) -> Course:
    try:
        identifier = Slug(slug)
    except ValueError as exc:
        raise CourseNotFoundError(slug) from exc

    course = await courses.get_published_by_slug(identifier)
    if course is None:
        raise CourseNotFoundError(slug)

    return course


class EnrollInCourse:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        cohorts: CohortRepository,
        clock: Clock,
    ) -> None:
        self._courses = courses
        self._enrollments = enrollments
        self._cohorts = cohorts
        self._clock = clock

    async def execute(
        self, *, user_id: UUID, slug: str, cohort_code: str | None = None
    ) -> Enrollment:
        # Only published courses. Enrolling into a draft would give a teacher a
        # course that then vanishes from their panel when it is unpublished.
        course = await _published_course(self._courses, slug)

        if await self._enrollments.get(user_id=user_id, course_id=course.id) is not None:
            raise AlreadyEnrolledError()

        cohort_id = None
        if cohort_code:
            cohort_id = await self._cohorts.id_for_code(cohort_code.strip())
            if cohort_id is None:
                # Loudly, not silently. A teacher typing the code from their
                # talk and being enrolled with no attribution is exactly the
                # data loss that makes the alliance metric meaningless.
                raise CohortNotFoundError(cohort_code)

        enrollment = Enrollment.create(
            user_id=user_id,
            course_id=course.id,
            enrolled_at=self._clock.now(),
            cohort_id=cohort_id,
        )
        await self._enrollments.add(enrollment)

        return enrollment


class ListMyCourses:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
    ) -> None:
        self._courses = courses
        self._enrollments = enrollments
        self._progress = progress

    async def execute(self, *, user_id: UUID) -> list[EnrolledCourse]:
        enrollments = await self._enrollments.list_for_user(user_id)
        if not enrollments:
            return []

        # One query for every enrollment's completions, not one per course.
        completions = await self._progress.completed_by_enrollment(
            [enrollment.id for enrollment in enrollments]
        )

        results: list[EnrolledCourse] = []
        for enrollment in enrollments:
            course = await self._courses.get_by_id(enrollment.course_id)
            if course is None:
                # The course was withdrawn from the catalog. The enrollment
                # survives — PRD A-04 keeps certificates verifiable — but there
                # is nothing to render, so it is skipped rather than crashing.
                continue

            results.append(
                EnrolledCourse(
                    course=course.as_summary(),
                    enrolled_at=enrollment.enrolled_at,
                    progress=compute_progress(course, completions.get(enrollment.id, set())),
                )
            )

        return results


class GetCourseProgress:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
    ) -> None:
        self._courses = courses
        self._enrollments = enrollments
        self._progress = progress

    async def execute(self, *, user_id: UUID, slug: str) -> CourseProgress:
        course = await _published_course(self._courses, slug)

        enrollment = await self._enrollments.get(user_id=user_id, course_id=course.id)
        if enrollment is None:
            raise NotEnrolledError()

        completed = await self._progress.completed_lesson_ids(enrollment.id)

        return compute_progress(course, completed)


class CompleteLesson:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
    ) -> None:
        self._courses = courses
        self._enrollments = enrollments
        self._progress = progress

    async def execute(self, *, user_id: UUID, slug: str, lesson_id: UUID) -> CourseProgress:
        course = await _published_course(self._courses, slug)

        enrollment = await self._enrollments.get(user_id=user_id, course_id=course.id)
        if enrollment is None:
            raise NotEnrolledError()

        # The lesson must belong to *this* course. Without the check, a lesson id
        # from any other course would be accepted and quietly inflate progress.
        if find_lesson(course, lesson_id) is None:
            raise LessonNotInCourseError()

        await self._progress.mark_completed(enrollment_id=enrollment.id, lesson_id=lesson_id)

        completed = await self._progress.completed_lesson_ids(enrollment.id)

        return compute_progress(course, completed)
