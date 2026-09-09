from typing import Protocol
from uuid import UUID

from app.features.enrollment.domain.entities import Enrollment, LessonContent


class EnrollmentRepository(Protocol):
    async def get(self, *, user_id: UUID, course_id: UUID) -> Enrollment | None: ...

    async def add(self, enrollment: Enrollment) -> None: ...

    async def list_for_user(self, user_id: UUID) -> list[Enrollment]: ...


class ProgressRepository(Protocol):
    async def completed_lesson_ids(self, enrollment_id: UUID) -> set[UUID]: ...

    async def completed_by_enrollment(self, enrollment_ids: list[UUID]) -> dict[UUID, set[UUID]]:
        """Completions for several enrollments at once.

        "Mis cursos" needs progress for every course a teacher joined. Asking
        one query per enrollment is the classic N+1 — and it is the screen the
        teacher opens first, every single time.
        """
        ...

    async def passed_activity_ids(self, *, user_id: UUID, course_id: UUID) -> set[UUID]:
        """Activities this teacher has already passed in this course.

        An activity counts as passed if **any** attempt passed — the same rule
        the certificate criteria use. Someone who failed twice and got it right
        on the third try has learned it, which is the point of allowing retries.

        Without this the syllabus showed a completion mark next to every lesson
        and nothing next to the activity, so a teacher who had passed the
        exercise saw no acknowledgement of the hardest thing they did.
        """
        ...

    async def mark_completed(self, *, enrollment_id: UUID, lesson_id: UUID) -> None:
        """Idempotent: marking a lesson done twice is not an error.

        A flaky connection retrying the request must not be punished, and the
        teacher pressing the button again should see the same thing.
        """
        ...


class CohortRepository(Protocol):
    async def id_for_code(self, code: str) -> UUID | None: ...


class LessonContentRepository(Protocol):
    async def get_content(self, lesson_id: UUID) -> LessonContent | None: ...
