"""Instructor use cases: authoring, review and roster."""

from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID, uuid4

import structlog

from app.features.auth.domain.entities import Role, User
from app.features.auth.domain.ports import Clock
from app.features.catalog.domain.entities import Course, CourseStatus, LessonKind, Level, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.domain.ports import CourseRepository
from app.features.evaluation.domain.scoring import MAX_SCORE, MIN_SCORE
from app.features.instructor.domain.authoring import can_unpublish, check_publish_readiness
from app.features.instructor.domain.errors import (
    CourseNotReadyError,
    ForeignMediaReferenceError,
    LessonNotFoundError,
    ModuleNotFoundError,
    NotPublishedError,
    NotYourCourseError,
    PublishedSlugChangeError,
    SlugTakenError,
)
from app.features.instructor.domain.ports import (
    CourseDraft,
    CourseWriter,
    ReviewReader,
    RosterEntry,
    RosterReader,
    ScoreOverrideWriter,
    SubmissionForReview,
)
from app.features.storage.domain.ports import ObjectStorage
from app.shared.errors import UnavailableError, ValidationError
from app.shared.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page

logger = structlog.get_logger()


class CourseOwnership:
    """The one rule every authoring use case shares.

    An instructor edits their own courses. An admin edits anything. Getting this
    wrong once means one instructor can rewrite another's work, so it lives in a
    single place rather than being repeated at each call site.
    """

    def __init__(self, *, courses: CourseRepository) -> None:
        self._courses = courses

    async def require(self, *, user: User, course_id: UUID) -> Course:
        course = await self._courses.get_by_id(course_id)
        if course is None:
            raise CourseNotFoundError(str(course_id))

        if user.role is Role.ADMIN:
            return course

        if course.instructor_id != user.id:
            raise NotYourCourseError()

        return course


class ListMyCourses:
    def __init__(self, *, writer: CourseWriter) -> None:
        self._writer = writer

    async def execute(self, *, user: User) -> list[Course]:
        return await self._writer.list_for_instructor(user.id)


class CreateCourse:
    def __init__(self, *, writer: CourseWriter) -> None:
        self._writer = writer

    async def execute(
        self,
        *,
        user: User,
        title: str,
        slug: str,
        summary: str,
        description: str,
        level: Level,
    ) -> Course:
        identifier = Slug(slug)

        if await self._writer.slug_taken(slug=identifier.value):
            raise SlugTakenError(identifier.value)

        # Courses are born as drafts. Publishing is a separate, deliberate act —
        # nobody should discover their half-written course in the catalog.
        return await self._writer.create(
            draft=CourseDraft(
                title=title.strip(),
                slug=identifier.value,
                summary=summary.strip(),
                description=description.strip(),
                level=level,
            ),
            instructor_id=user.id,
        )


class UpdateCourse:
    def __init__(self, *, courses: CourseRepository, writer: CourseWriter) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer

    async def execute(
        self,
        *,
        user: User,
        course_id: UUID,
        title: str,
        slug: str,
        summary: str,
        description: str,
        level: Level,
    ) -> Course:
        course = await self._ownership.require(user=user, course_id=course_id)
        identifier = Slug(slug)

        # A published course's address is in students' bookmarks and in whatever
        # the instructor pasted into a staff group. We keep no alias, so changing
        # it would silently 404 every link already in circulation. Refused here
        # rather than only in the UI: a rule the API does not enforce is not a
        # rule, it is a suggestion to whoever calls it directly.
        if identifier.value != course.slug.value and course.status is CourseStatus.PUBLISHED:
            raise PublishedSlugChangeError()

        if await self._writer.slug_taken(slug=identifier.value, excluding=course.id):
            raise SlugTakenError(identifier.value)

        await self._writer.update_details(
            course_id=course.id,
            draft=CourseDraft(
                title=title.strip(),
                slug=identifier.value,
                summary=summary.strip(),
                description=description.strip(),
                level=level,
            ),
        )

        updated = await self._ownership.require(user=user, course_id=course_id)
        return updated


class PublishCourse:
    def __init__(self, *, courses: CourseRepository, writer: CourseWriter, clock: Clock) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer
        self._clock = clock

    async def execute(self, *, user: User, course_id: UUID) -> Course:
        course = await self._ownership.require(user=user, course_id=course_id)

        readiness = check_publish_readiness(course)
        if not readiness.ready:
            raise CourseNotReadyError(readiness.blockers)

        # `published_at` is only set the first time. Re-publishing an archived
        # course must not move it back to the top of the catalog as if it were
        # new.
        published_at = course.published_at or self._clock.now()

        await self._writer.set_status(
            course_id=course.id, status=CourseStatus.PUBLISHED, published_at=published_at
        )

        logger.info("course_published", course_id=str(course.id), by=str(user.id))

        return await self._ownership.require(user=user, course_id=course_id)


class UnpublishCourse:
    """Withdraw a course from the catalog.

    Archived, not deleted: teachers already enrolled keep their access and their
    certificates stay verifiable (PRD A-04).
    """

    def __init__(self, *, courses: CourseRepository, writer: CourseWriter) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer

    async def execute(self, *, user: User, course_id: UUID) -> Course:
        course = await self._ownership.require(user=user, course_id=course_id)

        if not can_unpublish(course):
            raise NotPublishedError()

        await self._writer.set_status(
            course_id=course.id,
            status=CourseStatus.ARCHIVED,
            published_at=course.published_at,
        )

        logger.info("course_unpublished", course_id=str(course.id), by=str(user.id))

        return await self._ownership.require(user=user, course_id=course_id)


class AddModule:
    def __init__(self, *, courses: CourseRepository, writer: CourseWriter) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer

    async def execute(self, *, user: User, course_id: UUID, title: str) -> UUID:
        course = await self._ownership.require(user=user, course_id=course_id)

        # Appended at the end. Positions are assigned here rather than sent by
        # the client so two modules can never claim the same slot.
        position = len(course.modules) + 1

        return await self._writer.add_module(
            course_id=course.id, title=title.strip(), position=position
        )


class AddLesson:
    def __init__(self, *, courses: CourseRepository, writer: CourseWriter) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer

    async def execute(
        self,
        *,
        user: User,
        course_id: UUID,
        module_id: UUID,
        title: str,
        kind: LessonKind,
        duration_seconds: int,
        body: str,
    ) -> UUID:
        course = await self._ownership.require(user=user, course_id=course_id)

        module = next((item for item in course.modules if item.id == module_id), None)
        # The module must belong to *this* course, or an instructor could append
        # lessons to somebody else's course by passing its module id.
        if module is None:
            raise ModuleNotFoundError()

        return await self._writer.add_lesson(
            module_id=module.id,
            title=title.strip(),
            kind=kind,
            position=len(module.lessons) + 1,
            duration_seconds=max(0, duration_seconds),
            body=body,
        )


class ListSubmissionsForReview:
    def __init__(self, *, reviews: ReviewReader) -> None:
        self._reviews = reviews

    async def execute(
        self,
        *,
        user: User,
        course_id: UUID | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
        offset: int = 0,
    ) -> Page[SubmissionForReview]:
        size = max(1, min(limit, MAX_PAGE_SIZE))

        return Page(
            items=await self._reviews.inbox(
                instructor_id=user.id, course_id=course_id, limit=size, offset=offset
            ),
            total=await self._reviews.inbox_size(instructor_id=user.id, course_id=course_id),
            limit=size,
            offset=offset,
        )


class OverrideScore:
    """Correct an automatic mark (PRD I-03).

    The reason is mandatory and the original score is never overwritten. This is
    the mechanism the TRD (§9.3) says the certification needs to be defensible:
    without a human able to disagree with the machine, and a record of them
    doing it, the grade is only as trustworthy as the model.
    """

    def __init__(
        self,
        *,
        courses: CourseRepository,
        reviews: ReviewReader,
        overrides: ScoreOverrideWriter,
        clock: Clock,
    ) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._reviews = reviews
        self._overrides = overrides
        self._clock = clock

    async def execute(
        self, *, user: User, submission_id: UUID, new_total: float, reason: str
    ) -> None:
        cleaned = reason.strip()
        if not cleaned:
            raise ValueError("An override needs a justification")

        # Find the submission through the instructor's own inbox, which is
        # already scoped to their courses. Anything not in it is not theirs.
        inbox = await self._reviews.inbox(instructor_id=user.id)
        target = next((item for item in inbox if item.submission_id == submission_id), None)

        if target is None:
            raise NotYourCourseError()

        await self._ownership.require(user=user, course_id=target.course_id)

        bounded = max(MIN_SCORE, min(MAX_SCORE, new_total))

        await self._overrides.override(
            submission_id=submission_id,
            instructor_id=user.id,
            new_total=bounded,
            reason=cleaned,
            at=self._clock.now(),
        )

        logger.info(
            "score_overridden",
            submission_id=str(submission_id),
            instructor_id=str(user.id),
            new_total=bounded,
        )


class ListRoster:
    def __init__(self, *, courses: CourseRepository, roster: RosterReader) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._roster = roster

    async def execute(self, *, user: User, course_id: UUID) -> list[RosterEntry]:
        course = await self._ownership.require(user=user, course_id=course_id)
        return await self._roster.roster(course.id)


# What an instructor may upload. Not a free-for-all: the content type is signed
# into the upload URL, and allowing `text/html` would mean a file served from
# our own domain that we did not write.
ALLOWED_MEDIA_TYPES: dict[str, str] = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
}


class UnsupportedMediaTypeError(ValidationError):
    code = "unsupported_media_type"


@dataclass(frozen=True)
class MediaUpload:
    url: str
    reference: str
    expires_in_seconds: int


class PrepareLessonMedia:
    """Hand back a URL the instructor's browser can upload straight to.

    **The storage key is chosen here, never sent by the client.** A
    client-supplied key is a client that can write over another course's video,
    or read one back by asking for an upload URL to it.

    The key carries a random segment so replacing a lesson's media does not
    reuse the same URL — otherwise a browser that cached the old file would keep
    playing it after the instructor swapped it.
    """

    def __init__(
        self, *, courses: CourseRepository, writer: CourseWriter, storage: ObjectStorage
    ) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer
        self._storage = storage

    async def execute(
        self,
        *,
        user: User,
        course_id: UUID,
        lesson_id: UUID,
        content_type: str,
        ttl: timedelta,
    ) -> MediaUpload:
        extension = ALLOWED_MEDIA_TYPES.get(content_type)
        if extension is None:
            raise UnsupportedMediaTypeError(
                f"Unsupported media type {content_type!r}. "
                f"Allowed: {', '.join(sorted(ALLOWED_MEDIA_TYPES))}"
            )

        course = await self._ownership.require(user=user, course_id=course_id)
        if not await self._writer.lesson_belongs_to(lesson_id=lesson_id, course_id=course.id):
            raise LessonNotFoundError()

        reference = f"lessons/{lesson_id}/{uuid4().hex}.{extension}"

        try:
            signed = self._storage.write_url(reference, content_type=content_type, ttl=ttl)
        except NotImplementedError as exc:
            # The development adapter cannot issue uploads. An instructor
            # deserves "storage is not configured" rather than a 500 that tells
            # them nothing and looks like their file was the problem.
            raise UnavailableError(
                "Uploads need object storage configured. Contact an administrator"
            ) from exc

        return MediaUpload(
            url=signed.url,
            reference=reference,
            expires_in_seconds=signed.expires_in_seconds,
        )


class AttachLessonMedia:
    """Point the lesson at an object the browser has finished uploading.

    Separate from `PrepareLessonMedia` because the upload happens between them,
    directly against the storage: we only learn it succeeded when the browser
    says so.

    The reference is checked to be inside this lesson's own prefix. Without that
    an instructor could attach any key they could name — including one belonging
    to a course they cannot see.
    """

    def __init__(self, *, courses: CourseRepository, writer: CourseWriter) -> None:
        self._ownership = CourseOwnership(courses=courses)
        self._writer = writer

    async def execute(
        self, *, user: User, course_id: UUID, lesson_id: UUID, reference: str | None
    ) -> None:
        course = await self._ownership.require(user=user, course_id=course_id)
        if not await self._writer.lesson_belongs_to(lesson_id=lesson_id, course_id=course.id):
            raise LessonNotFoundError()

        if reference is not None and not reference.startswith(f"lessons/{lesson_id}/"):
            raise ForeignMediaReferenceError()

        await self._writer.set_lesson_media(lesson_id=lesson_id, reference=reference)
