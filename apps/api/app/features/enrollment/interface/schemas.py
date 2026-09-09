from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.features.catalog.interface.schemas import CourseSummaryResponse
from app.features.enrollment.domain.entities import (
    CourseProgress,
    EnrolledCourse,
    Enrollment,
    LessonRef,
    LessonView,
)
from app.features.storage.domain.ports import SignedUrl


class EnrollRequest(BaseModel):
    course_slug: str = Field(min_length=1, max_length=160)
    # The short code handed out at the in-person talk. Optional: enrollment is
    # also open to anyone who finds the catalog on their own.
    cohort_code: str | None = Field(default=None, max_length=32)


class NextLessonResponse(BaseModel):
    """Where "continuar" takes the teacher (PRD E-04)."""

    lesson_id: UUID
    lesson_title: str
    module_id: UUID
    module_title: str

    @classmethod
    def from_entity(cls, ref: LessonRef) -> "NextLessonResponse":
        return cls(
            lesson_id=ref.lesson_id,
            lesson_title=ref.lesson_title,
            module_id=ref.module_id,
            module_title=ref.module_title,
        )


class ProgressResponse(BaseModel):
    total_lessons: int
    completed_lessons: int
    percentage: int
    is_complete: bool
    completed_lesson_ids: list[UUID]
    # Null once the course is finished — that absence is what the client uses to
    # swap "continuar" for "completado".
    next_lesson: NextLessonResponse | None

    @classmethod
    def from_entity(cls, progress: CourseProgress) -> "ProgressResponse":
        return cls(
            total_lessons=progress.total_lessons,
            completed_lessons=progress.completed_lessons,
            percentage=progress.percentage,
            is_complete=progress.is_complete,
            completed_lesson_ids=sorted(progress.completed_lesson_ids, key=str),
            next_lesson=(
                NextLessonResponse.from_entity(progress.next_lesson)
                if progress.next_lesson
                else None
            ),
        )


class EnrollmentResponse(BaseModel):
    id: UUID
    course_id: UUID
    enrolled_at: datetime | None
    cohort_id: UUID | None

    @classmethod
    def from_entity(cls, enrollment: Enrollment) -> "EnrollmentResponse":
        return cls(
            id=enrollment.id,
            course_id=enrollment.course_id,
            enrolled_at=enrollment.enrolled_at,
            cohort_id=enrollment.cohort_id,
        )


class EnrolledCourseResponse(BaseModel):
    course: CourseSummaryResponse
    enrolled_at: datetime | None
    progress: ProgressResponse

    @classmethod
    def from_entity(cls, enrolled: EnrolledCourse) -> "EnrolledCourseResponse":
        return cls(
            course=CourseSummaryResponse.from_entity(enrolled.course),
            enrolled_at=enrolled.enrolled_at,
            progress=ProgressResponse.from_entity(enrolled.progress),
        )


class LessonViewResponse(BaseModel):
    """One lesson plus its neighbours.

    Prev/next travel with the lesson so the reader can move without another
    round trip. On school Wi-Fi every avoided request is a page that loads.
    """

    lesson_id: UUID
    title: str
    module_title: str
    kind: str
    duration_seconds: int
    body: str
    resource_ref: str | None
    # A temporary URL for the media, resolved server-side from `resource_ref`.
    # The client never builds it: a client that composes storage keys is a
    # client that can ask for someone else's lesson.
    media_url: str | None = None
    media_expires_in: int | None = None
    is_completed: bool
    position: int
    total_lessons: int
    previous: NextLessonResponse | None
    next: NextLessonResponse | None

    @classmethod
    def from_entity(cls, view: LessonView, media: SignedUrl | None = None) -> "LessonViewResponse":
        return cls(
            lesson_id=view.lesson.lesson_id,
            title=view.lesson.lesson_title,
            module_title=view.lesson.module_title,
            kind=view.kind,
            duration_seconds=view.duration_seconds,
            body=view.content.body,
            resource_ref=view.content.resource_ref,
            media_url=media.url if media else None,
            media_expires_in=media.expires_in_seconds if media else None,
            is_completed=view.is_completed,
            position=view.position,
            total_lessons=view.total_lessons,
            previous=NextLessonResponse.from_entity(view.previous) if view.previous else None,
            next=NextLessonResponse.from_entity(view.next) if view.next else None,
        )
