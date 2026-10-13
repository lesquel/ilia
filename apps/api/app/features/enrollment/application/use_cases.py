"""Enrollment and progress use cases."""

from datetime import date
from uuid import UUID

from app.features.auth.domain.ports import Clock
from app.features.catalog.domain.entities import Course, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.domain.ports import CourseRepository
from app.features.enrollment.domain.entities import (
    Cohort,
    CourseProgress,
    EnrolledCourse,
    Enrollment,
    LessonContent,
    LessonView,
    compute_progress,
    find_lesson,
    neighbours,
    syllabus_order,
)
from app.features.enrollment.domain.errors import (
    AlreadyEnrolledError,
    CohortCodeTakenError,
    CohortNotFoundError,
    LessonNotInCourseError,
    NotEnrolledError,
)
from app.features.enrollment.domain.ports import (
    CohortRepository,
    EnrollmentRepository,
    LessonContentRepository,
    ProgressRepository,
)
from app.shared.errors import ValidationError


async def _published_course(courses: CourseRepository, slug: str) -> Course:
    try:
        identifier = Slug(slug)
    except ValueError as exc:
        raise CourseNotFoundError(slug) from exc

    course = await courses.get_published_by_slug(identifier)
    if course is None:
        raise CourseNotFoundError(slug)

    return course


class CreateCohort:
    """Open a charla so teachers can join it with a code.

    Seed can still plant a demo code, but a real talk is a product action —
    someone types a name and a code, not a script.
    """

    def __init__(self, *, cohorts: CohortRepository, clock: Clock) -> None:
        self._cohorts = cohorts
        self._clock = clock

    async def execute(self, *, name: str, code: str, starts_on: date | None = None) -> Cohort:
        try:
            cohort = Cohort.create(
                name=name, code=code, starts_on=starts_on, created_at=self._clock.now()
            )
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        if await self._cohorts.id_for_code(cohort.code) is not None:
            raise CohortCodeTakenError(cohort.code)
        await self._cohorts.add(cohort)
        return cohort


class ListCohorts:
    def __init__(self, *, cohorts: CohortRepository) -> None:
        self._cohorts = cohorts

    async def execute(self) -> list[Cohort]:
        return await self._cohorts.list_all()


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

            passed = await self._progress.passed_activity_ids(user_id=user_id, course_id=course.id)
            results.append(
                EnrolledCourse(
                    course=course.as_summary(),
                    enrolled_at=enrollment.enrolled_at,
                    progress=compute_progress(
                        course, completions.get(enrollment.id, set()), passed
                    ),
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
        positions = await self._progress.positions_for_enrollment(enrollment.id)
        passed = await self._progress.passed_activity_ids(user_id=user_id, course_id=course.id)

        return compute_progress(course, completed, passed, positions)


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

        await self._progress.mark_completed(
            enrollment_id=enrollment.id, course_id=course.id, lesson_id=lesson_id
        )

        completed = await self._progress.completed_lesson_ids(enrollment.id)
        positions = await self._progress.positions_for_enrollment(enrollment.id)
        passed = await self._progress.passed_activity_ids(user_id=user_id, course_id=course.id)

        return compute_progress(course, completed, passed, positions)


class RecordLessonPosition:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
        clock: Clock,
    ) -> None:
        self._courses, self._enrollments, self._progress, self._clock = (
            courses,
            enrollments,
            progress,
            clock,
        )

    async def execute(
        self, *, user_id: UUID, slug: str, lesson_id: UUID, position_seconds: int
    ) -> None:
        course = await _published_course(self._courses, slug)
        enrollment = await self._enrollments.get(user_id=user_id, course_id=course.id)
        if enrollment is None:
            raise NotEnrolledError()
        if find_lesson(course, lesson_id) is None:
            raise LessonNotInCourseError()
        await self._progress.record_position(
            enrollment_id=enrollment.id,
            course_id=course.id,
            lesson_id=lesson_id,
            position_seconds=max(0, position_seconds),
            at=self._clock.now(),
        )


class GetLesson:
    """Read one lesson's material.

    Enrollment is checked before any content is loaded. The syllabus is public,
    the material is not — and that gate lives here, not in the client.
    """

    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
        contents: LessonContentRepository,
    ) -> None:
        self._courses = courses
        self._enrollments = enrollments
        self._progress = progress
        self._contents = contents

    async def execute(self, *, user_id: UUID, slug: str, lesson_id: UUID) -> LessonView:
        course = await _published_course(self._courses, slug)

        enrollment = await self._enrollments.get(user_id=user_id, course_id=course.id)
        if enrollment is None:
            raise NotEnrolledError()

        lesson = find_lesson(course, lesson_id)
        if lesson is None:
            raise LessonNotInCourseError()

        previous, following, position = neighbours(course, lesson_id)
        order = syllabus_order(course)
        current = next(ref for ref in order if ref.lesson_id == lesson_id)

        content = await self._contents.get_content(lesson_id)
        completed = await self._progress.completed_lesson_ids(enrollment.id)
        resume_positions = await self._progress.positions_for_enrollment(enrollment.id)

        return LessonView(
            lesson=current,
            kind=lesson.kind.value,
            duration_seconds=lesson.duration_seconds,
            content=content or LessonContent(lesson_id=lesson_id, body="", resource_ref=None),
            is_completed=lesson_id in completed,
            resume_position_seconds=resume_positions.get(lesson_id, 0),
            previous=previous,
            next=following,
            position=position,
            total_lessons=len(order),
        )
