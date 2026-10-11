"""Enrollment and progress endpoints.

**All authenticated.** Unlike the catalog, everything here is about one specific
teacher — and the identity comes from the token, never from the request body.
A `user_id` parameter would let anyone enroll anybody.
"""

from datetime import timedelta
from uuid import UUID
from pydantic import BaseModel, Field

from fastapi import APIRouter, Request, status

from app.features.auth.interface.dependencies import CurrentUser, SettingsDep
from app.features.billing.application.use_cases import require_level
from app.features.billing.interface.dependencies import EntitlementsDep
from app.features.catalog.domain.entities import Slug
from app.features.catalog.interface.router import CoursesDep
from app.features.enrollment.application.use_cases import (
    CompleteLesson,
    EnrollInCourse,
    GetCourseProgress,
    GetLesson,
    ListMyCourses,
    RecordLessonPosition,
)
from app.features.enrollment.interface.dependencies import (
    CohortsDep,
    ContentsDep,
    EnrollmentsDep,
    ProgressDep,
)
from app.features.enrollment.interface.schemas import (
    EnrolledCourseResponse,
    EnrollmentResponse,
    EnrollRequest,
    LessonViewResponse,
    ProgressResponse,
)

router = APIRouter(prefix="/enrollments", tags=["enrollment"])


class LessonPositionRequest(BaseModel):
    position_seconds: int = Field(ge=0, le=86_400)


@router.post("", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll(
    payload: EnrollRequest,
    request: Request,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    cohorts: CohortsDep,
    entitlements: EntitlementsDep,
) -> EnrollmentResponse:
    # The plan gate (PRD 11): the free tier covers the basic path only. Checked
    # before enrolling rather than after, so a teacher is never given a course
    # and then locked out of it.
    if entitlements is not None:
        course = await courses.get_published_by_slug(Slug(payload.course_slug))
        if course is not None:
            require_level(entitlements, course.level)

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


@router.patch("/me/{slug}/lessons/{lesson_id}/position", status_code=status.HTTP_204_NO_CONTENT)
async def record_lesson_position(
    slug: str, lesson_id: UUID, payload: LessonPositionRequest, request: Request,
    user: CurrentUser, courses: CoursesDep, enrollments: EnrollmentsDep, progress: ProgressDep,
) -> None:
    await RecordLessonPosition(courses=courses, enrollments=enrollments, progress=progress,
        clock=request.app.state.auth["clock"]).execute(
            user_id=user.id, slug=slug, lesson_id=lesson_id, position_seconds=payload.position_seconds
        )


@router.get("/me/{slug}/lessons/{lesson_id}", response_model=LessonViewResponse)
async def read_lesson(
    slug: str,
    lesson_id: UUID,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    progress: ProgressDep,
    contents: ContentsDep,
    request: Request,
    settings: SettingsDep,
) -> LessonViewResponse:
    """The material of one lesson.

    Under `/enrollments` and not `/catalog` on purpose: the syllabus is public,
    the material is not, and the route says so.
    """
    view = await GetLesson(
        courses=courses, enrollments=enrollments, progress=progress, contents=contents
    ).execute(user_id=user.id, slug=slug, lesson_id=lesson_id)

    # The media link is minted here, after enrolment has been checked — which is
    # the whole reason it is short-lived and issued per request rather than
    # stored on the lesson.
    media = None
    if view.content.resource_ref:
        media = request.app.state.storage.read_url(
            view.content.resource_ref,
            ttl=timedelta(seconds=settings.storage_url_ttl_seconds),
        )

    return LessonViewResponse.from_entity(view, media)
