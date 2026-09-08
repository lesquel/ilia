"""Enrollment and progress endpoints.

**All authenticated.** Unlike the catalog, everything here is about one specific
teacher — and the identity comes from the token, never from the request body.
A `user_id` parameter would let anyone enroll anybody.
"""

from uuid import UUID

from fastapi import APIRouter, Request, status

from app.features.auth.interface.dependencies import CurrentUser
from app.features.catalog.interface.router import CoursesDep
from app.features.enrollment.application.use_cases import (
    CompleteLesson,
    EnrollInCourse,
    GetCourseProgress,
    ListMyCourses,
)
from app.features.enrollment.interface.dependencies import (
    CohortsDep,
    EnrollmentsDep,
    ProgressDep,
)
from app.features.enrollment.interface.schemas import (
    EnrolledCourseResponse,
    EnrollmentResponse,
    EnrollRequest,
    ProgressResponse,
)

router = APIRouter(prefix="/enrollments", tags=["enrollment"])


@router.post("", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll(
    payload: EnrollRequest,
    request: Request,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    cohorts: CohortsDep,
) -> EnrollmentResponse:
    use_case = EnrollInCourse(
        courses=courses,
        enrollments=enrollments,
        cohorts=cohorts,
        clock=request.app.state.auth["clock"],
    )

    enrollment = await use_case.execute(
        user_id=user.id,
        slug=payload.course_slug,
        cohort_code=payload.cohort_code,
    )

    return EnrollmentResponse.from_entity(enrollment)


@router.get("/me", response_model=list[EnrolledCourseResponse])
async def my_courses(
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    progress: ProgressDep,
) -> list[EnrolledCourseResponse]:
    results = await ListMyCourses(
        courses=courses, enrollments=enrollments, progress=progress
    ).execute(user_id=user.id)

    return [EnrolledCourseResponse.from_entity(item) for item in results]


@router.get("/me/{slug}", response_model=ProgressResponse)
async def course_progress(
    slug: str,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    progress: ProgressDep,
) -> ProgressResponse:
    result = await GetCourseProgress(
        courses=courses, enrollments=enrollments, progress=progress
    ).execute(user_id=user.id, slug=slug)

    return ProgressResponse.from_entity(result)


@router.post("/me/{slug}/lessons/{lesson_id}/complete", response_model=ProgressResponse)
async def complete_lesson(
    slug: str,
    lesson_id: UUID,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    progress: ProgressDep,
) -> ProgressResponse:
    """Mark a lesson done and return the updated progress.

    Returns the whole progress rather than 204 so the client can redraw the bar
    and the next-lesson pointer from one round trip, instead of firing a second
    request over a connection that may not be there.
    """
    result = await CompleteLesson(
        courses=courses, enrollments=enrollments, progress=progress
    ).execute(user_id=user.id, slug=slug, lesson_id=lesson_id)

    return ProgressResponse.from_entity(result)
