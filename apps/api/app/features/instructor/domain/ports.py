"""Ports for authoring and review.

Writing is a separate port from reading on purpose. `CourseRepository` in the
catalog is read-only and serves the public; nothing that serves a teacher
browsing courses should be able to change one.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.features.catalog.domain.entities import Course, CourseStatus, LessonKind, Level


@dataclass(frozen=True)
class CourseDraft:
    title: str
    slug: str
    summary: str
    description: str
    level: Level


class CourseWriter(Protocol):
    async def create(self, *, draft: CourseDraft, instructor_id: UUID) -> Course: ...

    async def update_details(self, *, course_id: UUID, draft: CourseDraft) -> None: ...

    async def set_status(
        self, *, course_id: UUID, status: CourseStatus, published_at: datetime | None
    ) -> None: ...

    async def slug_taken(self, *, slug: str, excluding: UUID | None = None) -> bool: ...

    async def add_module(self, *, course_id: UUID, title: str, position: int) -> UUID: ...

    async def add_lesson(
        self,
        *,
        module_id: UUID,
        title: str,
        kind: LessonKind,
        position: int,
        duration_seconds: int,
        body: str,
    ) -> UUID: ...

    async def set_lesson_media(self, *, lesson_id: UUID, reference: str | None) -> None:
        """Point a lesson at an uploaded object, or clear it."""
        ...

    async def add_activity(
        self,
        *,
        module_id: UUID,
        course_id: UUID,
        title: str,
        statement: str,
        max_attempts: int,
        checks: dict[str, object],
        rubric_name: str,
        dimensions: list[dict[str, object]],
    ) -> UUID:
        """Create a lab activity together with its rubric.

        One operation, not two. An activity without a rubric cannot be graded,
        and a rubric with no activity is nothing — leaving a window where one
        exists without the other would mean a teacher can open an activity that
        cannot score them.
        """
        ...

    async def module_belongs_to(self, *, module_id: UUID, course_id: UUID) -> bool: ...

    async def lesson_belongs_to(self, *, lesson_id: UUID, course_id: UUID) -> bool:
        """Whether this lesson is part of this course.

        Checked before anything touches it: without this an instructor could
        attach media to a lesson of somebody else's course by passing its id.
        """
        ...

    async def list_for_instructor(self, instructor_id: UUID) -> list[Course]:
        """Every course this instructor owns, drafts included.

        Deliberately not the catalog repository: an instructor must see their
        own unpublished work, which is exactly what the public listing hides.
        """
        ...


@dataclass(frozen=True)
class SubmissionForReview:
    submission_id: UUID
    activity_id: UUID
    activity_title: str
    course_id: UUID
    student_id: UUID
    student_name: str
    attempt: int
    prompt: str
    submitted_at: datetime | None
    total: float | None
    effective_total: float | None
    passed: bool
    was_overridden: bool


class ReviewReader(Protocol):
    async def inbox(
        self,
        *,
        instructor_id: UUID,
        course_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SubmissionForReview]: ...

    async def inbox_size(self, *, instructor_id: UUID, course_id: UUID | None = None) -> int:
        """How many are waiting, so the page can say what it is not showing."""
        ...


class ScoreOverrideWriter(Protocol):
    async def override(
        self,
        *,
        submission_id: UUID,
        instructor_id: UUID,
        new_total: float,
        reason: str,
        at: datetime,
    ) -> None:
        """Record an instructor's correction.

        Writes beside the automatic score, never over it (PRD I-03). The
        original mark, who changed it, when and why all survive — without that
        the override is not defensible either.
        """
        ...


@dataclass(frozen=True)
class RosterEntry:
    user_id: UUID
    full_name: str
    email: str
    enrolled_at: datetime | None
    cohort_name: str | None
    lessons_completed: int
    lessons_total: int
    last_activity_at: datetime | None


class RosterReader(Protocol):
    async def roster(self, course_id: UUID) -> list[RosterEntry]: ...
