"""Instructor endpoints (PRD I-01 … I-04).

Every route requires the instructor role. That is only the first gate: whether
this instructor owns *this* course is decided in the application layer, because
it needs the course to answer.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field

from app.features.auth.domain.entities import Role, User
from app.features.auth.interface.dependencies import require_role
from app.features.catalog.domain.entities import Course, LessonKind, Level
from app.features.catalog.interface.router import CoursesDep
from app.features.instructor.application.use_cases import (
    AddLesson,
    AddModule,
    CreateCourse,
    ListMyCourses,
    ListRoster,
    ListSubmissionsForReview,
    OverrideScore,
    PublishCourse,
    UnpublishCourse,
    UpdateCourse,
)
from app.features.instructor.domain.authoring import check_publish_readiness
from app.features.instructor.domain.ports import RosterEntry, SubmissionForReview
from app.features.instructor.interface.dependencies import (
    OverridesDep,
    ReviewsDep,
    RosterDep,
    WriterDep,
)
from app.shared.errors import ValidationError
from app.shared.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(prefix="/instructor", tags=["instructor"])

Instructor = Annotated[User, Depends(require_role(Role.INSTRUCTOR))]


class CourseDraftRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=400)
    description: str = Field(default="", max_length=20000)
    level: Level = Level.BEGINNER


class AuthoredCourseResponse(BaseModel):
    """A course as its author sees it.

    Carries `publish_blockers` even when the course is already live: an
    instructor editing a published course should know the moment they break it,
    not when they next try to publish.
    """

    id: UUID
    slug: str
    title: str
    summary: str
    description: str
    level: str
    status: str
    module_count: int
    lesson_count: int
    duration_seconds: int
    published_at: datetime | None
    publish_blockers: list[str]

    @classmethod
    def from_entity(cls, course: Course) -> "AuthoredCourseResponse":
        return cls(
            id=course.id,
            slug=str(course.slug),
            title=course.title,
            summary=course.summary,
            description=course.description,
            level=course.level.value,
            status=course.status.value,
            module_count=len(course.modules),
            lesson_count=course.lesson_count,
            duration_seconds=course.duration_seconds,
            published_at=course.published_at,
            publish_blockers=check_publish_readiness(course).blockers,
        )


@router.get("/courses", response_model=list[AuthoredCourseResponse])
async def my_courses(user: Instructor, writer: WriterDep) -> list[AuthoredCourseResponse]:
    """Every course this instructor owns, **drafts included**.

    Not the catalog listing: that one hides unpublished work, which is exactly
    what an author needs to see.
    """
    courses = await ListMyCourses(writer=writer).execute(user=user)
    return [AuthoredCourseResponse.from_entity(item) for item in courses]


@router.post("/courses", response_model=AuthoredCourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseDraftRequest, user: Instructor, writer: WriterDep
) -> AuthoredCourseResponse:
    try:
        course = await CreateCourse(writer=writer).execute(
            user=user,
            title=payload.title,
            slug=payload.slug,
            summary=payload.summary,
            description=payload.description,
            level=payload.level,
        )
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc

    return AuthoredCourseResponse.from_entity(course)


@router.put("/courses/{course_id}", response_model=AuthoredCourseResponse)
async def update_course(
    course_id: UUID,
    payload: CourseDraftRequest,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> AuthoredCourseResponse:
    try:
        course = await UpdateCourse(courses=courses, writer=writer).execute(
            user=user,
            course_id=course_id,
            title=payload.title,
            slug=payload.slug,
            summary=payload.summary,
            description=payload.description,
            level=payload.level,
        )
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc

    return AuthoredCourseResponse.from_entity(course)


@router.post("/courses/{course_id}/publish", response_model=AuthoredCourseResponse)
async def publish(
    course_id: UUID,
    request: Request,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> AuthoredCourseResponse:
    course = await PublishCourse(
        courses=courses, writer=writer, clock=request.app.state.auth["clock"]
    ).execute(user=user, course_id=course_id)

    return AuthoredCourseResponse.from_entity(course)


@router.post("/courses/{course_id}/unpublish", response_model=AuthoredCourseResponse)
async def unpublish(
    course_id: UUID, user: Instructor, courses: CoursesDep, writer: WriterDep
) -> AuthoredCourseResponse:
    """Withdraw from the catalog. Enrolled teachers keep their access."""
    course = await UnpublishCourse(courses=courses, writer=writer).execute(
        user=user, course_id=course_id
    )

    return AuthoredCourseResponse.from_entity(course)


class ModuleRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class CreatedResponse(BaseModel):
    id: UUID


@router.post(
    "/courses/{course_id}/modules",
    response_model=CreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_module(
    course_id: UUID,
    payload: ModuleRequest,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> CreatedResponse:
    module_id = await AddModule(courses=courses, writer=writer).execute(
        user=user, course_id=course_id, title=payload.title
    )
    return CreatedResponse(id=module_id)


class LessonRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: LessonKind = LessonKind.TEXT
    duration_seconds: int = Field(default=0, ge=0, le=60 * 60 * 8)
    body: str = Field(default="", max_length=50000)


@router.post(
    "/courses/{course_id}/modules/{module_id}/lessons",
    response_model=CreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_lesson(
    course_id: UUID,
    module_id: UUID,
    payload: LessonRequest,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> CreatedResponse:
    lesson_id = await AddLesson(courses=courses, writer=writer).execute(
        user=user,
        course_id=course_id,
        module_id=module_id,
        title=payload.title,
        kind=payload.kind,
        duration_seconds=payload.duration_seconds,
        body=payload.body,
    )
    return CreatedResponse(id=lesson_id)


class ReviewItemResponse(BaseModel):
    submission_id: UUID
    activity_title: str
    student_name: str
    attempt: int
    prompt: str
    submitted_at: datetime | None
    total: float | None
    effective_total: float | None
    passed: bool
    was_overridden: bool

    @classmethod
    def from_entity(cls, item: SubmissionForReview) -> "ReviewItemResponse":
        return cls(
            submission_id=item.submission_id,
            activity_title=item.activity_title,
            student_name=item.student_name,
            attempt=item.attempt,
            prompt=item.prompt,
            submitted_at=item.submitted_at,
            total=item.total,
            effective_total=item.effective_total,
            passed=item.passed,
            was_overridden=item.was_overridden,
        )


class ReviewPageResponse(BaseModel):
    """An inbox that says how much it is not showing.

    An instructor seeing fifty rows with no total cannot tell a full inbox from
    an empty-ish one, and plans their afternoon accordingly.
    """

    items: list[ReviewItemResponse]
    total: int
    limit: int
    offset: int


@router.get("/submissions", response_model=ReviewPageResponse)
async def review_inbox(
    user: Instructor,
    reviews: ReviewsDep,
    course_id: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ReviewPageResponse:
    page = await ListSubmissionsForReview(reviews=reviews).execute(
        user=user, course_id=course_id, limit=limit, offset=offset
    )
    return ReviewPageResponse(
        items=[ReviewItemResponse.from_entity(item) for item in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


class OverrideRequest(BaseModel):
    total: float = Field(ge=0, le=100)
    # Mandatory. An override with no justification is not reviewable, and the
    # certification's defence rests on being able to review it (TRD 9.3).
    reason: str = Field(min_length=1, max_length=1000)


@router.post("/submissions/{submission_id}/override", status_code=status.HTTP_204_NO_CONTENT)
async def override_score(
    submission_id: UUID,
    payload: OverrideRequest,
    request: Request,
    user: Instructor,
    courses: CoursesDep,
    reviews: ReviewsDep,
    overrides: OverridesDep,
) -> None:
    """Correct an automatic mark (PRD I-03).

    Written beside the original, never over it. Who, when and why are all kept.
    """
    try:
        await OverrideScore(
            courses=courses,
            reviews=reviews,
            overrides=overrides,
            clock=request.app.state.auth["clock"],
        ).execute(
            user=user,
            submission_id=submission_id,
            new_total=payload.total,
            reason=payload.reason,
        )
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


class RosterEntryResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    enrolled_at: datetime | None
    cohort_name: str | None
    lessons_completed: int
    lessons_total: int
    percentage: int
    last_activity_at: datetime | None

    @classmethod
    def from_entity(cls, entry: RosterEntry) -> "RosterEntryResponse":
        percentage = (
            round(entry.lessons_completed * 100 / entry.lessons_total) if entry.lessons_total else 0
        )

        return cls(
            user_id=entry.user_id,
            full_name=entry.full_name,
            email=entry.email,
            enrolled_at=entry.enrolled_at,
            cohort_name=entry.cohort_name,
            lessons_completed=entry.lessons_completed,
            lessons_total=entry.lessons_total,
            percentage=percentage,
            last_activity_at=entry.last_activity_at,
        )


@router.get("/courses/{course_id}/roster", response_model=list[RosterEntryResponse])
async def roster(
    course_id: UUID, user: Instructor, courses: CoursesDep, roster_reader: RosterDep
) -> list[RosterEntryResponse]:
    """Who is enrolled and how they are doing (PRD I-04).

    The email is included: this is the instructor's own course, and reaching a
    teacher who stopped halfway is the entire point of looking at this list.
    """
    entries = await ListRoster(courses=courses, roster=roster_reader).execute(
        user=user, course_id=course_id
    )
    return [RosterEntryResponse.from_entity(entry) for entry in entries]
