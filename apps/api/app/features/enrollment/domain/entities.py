"""Enrollment and progress.

One feature rather than two. The TRD lists `enrollment` and `learning`
separately, but progress has no meaning without an enrollment to hang it on:
splitting them would put an aggregate and its invariant in different folders and
force every progress read to reach across the boundary.

Pure Python — no ORM, no framework.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from app.features.catalog.domain.entities import Course, CourseSummary, Lesson


@dataclass(frozen=True)
class LessonRef:
    """Where a lesson sits in the syllabus.

    Carries the module context because "the next lesson" is a question about the
    whole course, not about one module — and a screen that says "continue" has
    to be able to name the module the teacher is returning to.
    """

    lesson_id: UUID
    lesson_title: str
    module_id: UUID
    module_title: str
    module_position: int
    lesson_position: int

    @property
    def order_key(self) -> tuple[int, int]:
        return (self.module_position, self.lesson_position)


def syllabus_order(course: Course) -> list[LessonRef]:
    """Flatten a course into the exact order a teacher walks it."""
    return [
        LessonRef(
            lesson_id=lesson.id,
            lesson_title=lesson.title,
            module_id=module.id,
            module_title=module.title,
            module_position=module.position,
            lesson_position=lesson.position,
        )
        for module in course.ordered_modules
        for lesson in module.ordered_lessons
    ]


@dataclass
class Cohort:
    """A group of teachers from one in-person talk.

    The short `code` is what a teacher types at enrollment (PRD 12). It has to
    be unique: two charlas sharing a code would make the activation metric
    unanswerable.
    """

    id: UUID
    name: str
    code: str
    created_at: datetime | None = None

    @classmethod
    def create(cls, *, name: str, code: str, created_at: datetime | None = None) -> "Cohort":
        cleaned_name = name.strip()
        cleaned_code = code.strip().upper()
        if not cleaned_name:
            raise ValueError("Cohort name cannot be empty")
        if not cleaned_code:
            raise ValueError("Cohort code cannot be empty")
        return cls(id=uuid4(), name=cleaned_name, code=cleaned_code, created_at=created_at)


@dataclass
class Enrollment:
    id: UUID
    user_id: UUID
    course_id: UUID
    enrolled_at: datetime | None = None
    # Which in-person talk this teacher came from, when they came from one
    # (PRD open question 7). Null for someone who signed up on their own.
    cohort_id: UUID | None = None

    @classmethod
    def create(
        cls,
        *,
        user_id: UUID,
        course_id: UUID,
        enrolled_at: datetime | None = None,
        cohort_id: UUID | None = None,
    ) -> "Enrollment":
        return cls(
            id=uuid4(),
            user_id=user_id,
            course_id=course_id,
            enrolled_at=enrolled_at,
            cohort_id=cohort_id,
        )


@dataclass(frozen=True)
class CourseProgress:
    """How far along a teacher is, derived from what they have completed.

    Nothing here is stored. A cached percentage goes stale the moment an
    instructor adds a lesson, and a progress bar that says 100% next to an
    unfinished course destroys the only signal the teacher has.
    """

    total_lessons: int
    completed_lesson_ids: frozenset[UUID]
    next_lesson: LessonRef | None
    passed_activity_ids: frozenset[UUID] = frozenset()
    # Activities of the course that the teacher has not passed yet.
    pending_activity_ids: frozenset[UUID] = frozenset()

    @property
    def completed_lessons(self) -> int:
        return len(self.completed_lesson_ids)

    @property
    def percentage(self) -> int:
        if self.total_lessons == 0:
            return 0
        return round(self.completed_lessons * 100 / self.total_lessons)

    @property
    def is_complete(self) -> bool:
        # An empty course is not a finished course. Without this guard a syllabus
        # still being written would hand out completion for free.
        return self.total_lessons > 0 and self.completed_lessons >= self.total_lessons

    @property
    def is_finished(self) -> bool:
        # `is_complete` counts lessons only (certificates rely on that). A course
        # with a practice still to pass is not finished from the teacher's side.
        return self.is_complete and not self.pending_activity_ids

    @property
    def has_started(self) -> bool:
        return self.completed_lessons > 0


def compute_progress(
    course: Course,
    completed_lesson_ids: set[UUID],
    passed_activity_ids: set[UUID] | None = None,
) -> CourseProgress:
    """Progress for one course.

    `next_lesson` is the first lesson in syllabus order that is not done — which
    is what makes "resume exactly where I left off" (PRD E-04) answerable, and
    it is deliberately *not* "the lesson after the last one completed": a teacher
    who skipped ahead should be sent back to the gap, not further forward.
    """
    order = syllabus_order(course)
    known_ids = {ref.lesson_id for ref in order}

    # Ignore completions for lessons the course no longer has. An instructor
    # deleting a lesson must not push anyone above 100%.
    relevant = completed_lesson_ids & known_ids

    next_lesson = next((ref for ref in order if ref.lesson_id not in relevant), None)

    passed = passed_activity_ids or set()
    pending_activity_ids = frozenset(
        activity.id
        for module in course.modules
        for activity in module.activities
        if activity.id not in passed
    )

    return CourseProgress(
        total_lessons=len(order),
        completed_lesson_ids=frozenset(relevant),
        next_lesson=next_lesson,
        passed_activity_ids=frozenset(passed),
        pending_activity_ids=pending_activity_ids,
    )


@dataclass(frozen=True)
class EnrolledCourse:
    """One row of "Mis cursos": the card plus how far along it is."""

    course: CourseSummary
    enrolled_at: datetime | None
    progress: CourseProgress


def find_lesson(course: Course, lesson_id: UUID) -> Lesson | None:
    for module in course.modules:
        for lesson in module.lessons:
            if lesson.id == lesson_id:
                return lesson
    return None


@dataclass(frozen=True)
class LessonContent:
    """The material of one lesson.

    Separate from `Lesson` in the catalog because it is gated differently: the
    syllabus is public, the content is not.
    """

    lesson_id: UUID
    body: str
    resource_ref: str | None


@dataclass(frozen=True)
class LessonView:
    """Everything the lesson screen needs, in one response.

    Bundles the neighbours so the reader can move without another round trip —
    on school Wi-Fi, every avoided request is a page that actually loads.
    """

    lesson: LessonRef
    kind: str
    duration_seconds: int
    content: LessonContent
    is_completed: bool
    previous: LessonRef | None
    next: LessonRef | None
    position: int
    total_lessons: int


def neighbours(course: Course, lesson_id: UUID) -> tuple[LessonRef | None, LessonRef | None, int]:
    """The lessons before and after this one, plus its 1-based position.

    Navigation follows the syllabus, so it crosses module boundaries: the last
    lesson of module 1 is followed by the first of module 2, not by nothing.
    """
    order = syllabus_order(course)

    for index, ref in enumerate(order):
        if ref.lesson_id == lesson_id:
            return (
                order[index - 1] if index > 0 else None,
                order[index + 1] if index + 1 < len(order) else None,
                index + 1,
            )

    return None, None, 0
