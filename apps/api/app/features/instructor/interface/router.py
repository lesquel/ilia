"""Instructor endpoints (PRD I-01 … I-04).

Every route requires the instructor role. That is only the first gate: whether
this instructor owns *this* course is decided in the application layer, because
it needs the course to answer.
"""

from datetime import datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field

from app.features.auth.domain.entities import Role, User
from app.features.auth.interface.dependencies import SettingsDep, require_role
from app.features.catalog.domain.entities import Course, LessonKind, Level
from app.features.catalog.interface.router import CoursesDep
from app.features.catalog.interface.schemas import CourseDetailResponse
from app.features.evaluation.domain.rubric import DimensionKind
from app.features.instructor.application.use_cases import (
    AddLesson,
    AddModule,
    AttachLessonMedia,
    CreateActivity,
    CreateCourse,
    DimensionDraft,
    ListMyCourses,
    ListRoster,
    ListSubmissionsForReview,
    OverrideScore,
    PrepareLessonMedia,
    PublishCourse,
    ReadAuthoredCourse,
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


class MediaUploadRequest(BaseModel):
    content_type: str = Field(min_length=1, max_length=120)


class MediaUploadResponse(BaseModel):
    """Where to PUT the file, and the key to send back afterwards.

    The key is chosen by the server. A client that supplies its own is a client
    that can write over another course's video.
    """

    upload_url: str
    reference: str
    expires_in: int


class AttachMediaRequest(BaseModel):
    # Null clears the lesson's media, which is how an instructor removes a video
    # they uploaded by mistake.
    reference: str | None = None


@router.post("/courses/{course_id}/lessons/{lesson_id}/media", response_model=MediaUploadResponse)
async def prepare_lesson_media(
    course_id: UUID,
    lesson_id: UUID,
    payload: MediaUploadRequest,
    request: Request,
    settings: SettingsDep,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> MediaUploadResponse:
    """A short-lived URL the browser uploads to, directly.

    A hundred-megabyte file travelling through this process would hold a worker
    for minutes and buy nothing.
    """
    upload = await PrepareLessonMedia(
        courses=courses, writer=writer, storage=request.app.state.storage
    ).execute(
        user=user,
        course_id=course_id,
        lesson_id=lesson_id,
        content_type=payload.content_type,
        # Longer than a playback link: uploading a lesson video on school
        # Wi-Fi is not a thirty-second job.
        ttl=timedelta(seconds=max(settings.storage_url_ttl_seconds, 1800)),
    )

    return MediaUploadResponse(
        upload_url=upload.url,
        reference=upload.reference,
        expires_in=upload.expires_in_seconds,
    )


@router.put(
    "/courses/{course_id}/lessons/{lesson_id}/media", status_code=status.HTTP_204_NO_CONTENT
)
async def attach_lesson_media(
    course_id: UUID,
    lesson_id: UUID,
    payload: AttachMediaRequest,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> None:
    """Point the lesson at the uploaded object, once the browser confirms it."""
    await AttachLessonMedia(courses=courses, writer=writer).execute(
        user=user, course_id=course_id, lesson_id=lesson_id, reference=payload.reference
    )


class DimensionRequest(BaseModel):
    key: str = Field(min_length=1, max_length=60, pattern=r"^[a-z][a-z0-9_]*$")
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=500)
    # What this dimension judges: the teacher's prompt, or the model's output.
    # The split is the product's whole point (PRD 9.1) — someone who got a good
    # answer by luck and someone who wrote a good instruction are not the same.
    kind: DimensionKind = DimensionKind.PROMPT
    # Relative. Weights are normalised at scoring time, so removing a dimension
    # does not silently rescale everyone else's grade.
    weight: float = Field(default=1.0, gt=0, le=100)


class ActivityRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    statement: str = Field(min_length=1, max_length=5000)
    max_attempts: int = Field(default=3, ge=1, le=10)
    dimensions: list[DimensionRequest] = Field(min_length=1, max_length=8)

    # The deterministic checks. Optional, and the ones a teacher can act on in
    # ten seconds: "no dijiste en qué formato querés la respuesta".
    # Each group is a set of synonyms — matching any one of them counts.
    required_terms: list[list[str]] = Field(default_factory=list, max_length=20)
    min_length: int = Field(default=0, ge=0, le=4000)
    requires_format: bool = False
    requires_role: bool = False


@router.post(
    "/courses/{course_id}/modules/{module_id}/activities",
    response_model=CreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_activity(
    course_id: UUID,
    module_id: UUID,
    payload: ActivityRequest,
    user: Instructor,
    courses: CoursesDep,
    writer: WriterDep,
) -> CreatedResponse:
    """Author a lab activity, with its rubric.

    One call, not two: an activity without a rubric is one a teacher can open
    and that cannot grade them.
    """
    activity_id = await CreateActivity(courses=courses, writer=writer).execute(
        user=user,
        course_id=course_id,
        module_id=module_id,
        title=payload.title,
        statement=payload.statement,
        max_attempts=payload.max_attempts,
        dimensions=[
            DimensionDraft(
                key=item.key,
                name=item.name,
                description=item.description,
                kind=item.kind.value,
                weight=item.weight,
            )
            for item in payload.dimensions
        ],
        required_terms=payload.required_terms,
        min_length=payload.min_length,
        requires_format=payload.requires_format,
        requires_role=payload.requires_role,
    )

    return CreatedResponse(id=activity_id)


@router.get("/courses/{course_id}/detail", response_model=CourseDetailResponse)
async def read_authored_course(
    course_id: UUID,
    user: Instructor,
    courses: CoursesDep,
) -> CourseDetailResponse:
    """The syllabus of a course you own, published or not.

    The same shape the catalogue returns, so the editor renders exactly what a
    teacher will read — but reachable while the course is still a draft, which
    is the whole point of a draft.
    """
    course = await ReadAuthoredCourse(courses=courses).execute(user=user, course_id=course_id)
    return CourseDetailResponse.from_course(course)
