"""In-memory enrollment and progress, for fast unit tests and a database-less boot.

Not for production, same as its siblings.
"""

import asyncio
from datetime import datetime
from uuid import UUID

from app.features.enrollment.domain.entities import Cohort, Enrollment, LessonContent
from app.features.enrollment.domain.errors import AlreadyEnrolledError, CohortCodeTakenError


class InMemoryEnrollmentRepository:
    def __init__(self, enrollments: list[Enrollment] | None = None) -> None:
        self._enrollments = list(enrollments or [])
        self._lock = asyncio.Lock()

    async def get(self, *, user_id: UUID, course_id: UUID) -> Enrollment | None:
        return next(
            (
                enrollment
                for enrollment in self._enrollments
                if enrollment.user_id == user_id and enrollment.course_id == course_id
            ),
            None,
        )

    async def add(self, enrollment: Enrollment) -> None:
        async with self._lock:
            if await self.get(user_id=enrollment.user_id, course_id=enrollment.course_id):
                raise AlreadyEnrolledError()
            self._enrollments.append(enrollment)

    async def list_for_user(self, user_id: UUID) -> list[Enrollment]:
        mine = [item for item in self._enrollments if item.user_id == user_id]
        # Newest first, matching the SQL repository's ordering.
        return sorted(
            mine,
            key=lambda item: item.enrolled_at.timestamp() if item.enrolled_at else 0.0,
            reverse=True,
        )


class InMemoryProgressRepository:
    def __init__(self) -> None:
        self._completed: dict[UUID, set[UUID]] = {}
        self._positions: dict[UUID, dict[UUID, int]] = {}

    async def completed_lesson_ids(self, enrollment_id: UUID) -> set[UUID]:
        return set(self._completed.get(enrollment_id, set()))

    async def positions_for_enrollment(self, enrollment_id: UUID) -> dict[UUID, int]:
        return {
            lesson_id: seconds for lesson_id, seconds in self._positions.get(enrollment_id, {}).items()
            if lesson_id not in self._completed.get(enrollment_id, set())
        }

    async def completed_by_enrollment(self, enrollment_ids: list[UUID]) -> dict[UUID, set[UUID]]:
        return {
            enrollment_id: set(self._completed[enrollment_id])
            for enrollment_id in enrollment_ids
            if enrollment_id in self._completed
        }

    async def passed_activity_ids(self, *, user_id: UUID, course_id: UUID) -> set[UUID]:
        # The in-memory store holds no evaluations: the syllabus simply shows no
        # activity as passed, rather than inventing one that is.
        return set()

    async def mark_completed(self, *, enrollment_id: UUID, course_id: UUID, lesson_id: UUID) -> None:
        # A set makes this idempotent for free, which is the contract.
        self._completed.setdefault(enrollment_id, set()).add(lesson_id)
        self._positions.setdefault(enrollment_id, {}).pop(lesson_id, None)

    async def record_position(self, *, enrollment_id: UUID, course_id: UUID, lesson_id: UUID, position_seconds: int, at: datetime) -> None:
        self._positions.setdefault(enrollment_id, {})[lesson_id] = max(0, position_seconds)


class InMemoryCohortRepository:
    def __init__(self, codes: dict[str, UUID] | None = None) -> None:
        # The dict constructor is the seed the enrollment tests already use:
        # a code mapped to an id, without a name, because they only look up.
        self._cohorts = [
            Cohort(id=cohort_id, name=code, code=code.strip().upper())
            for code, cohort_id in (codes or {}).items()
        ]

    async def id_for_code(self, code: str) -> UUID | None:
        needle = code.strip().upper()
        return next((item.id for item in self._cohorts if item.code == needle), None)

    async def add(self, cohort: Cohort) -> None:
        if await self.id_for_code(cohort.code) is not None:
            raise CohortCodeTakenError(cohort.code)
        self._cohorts.append(cohort)

    async def list_all(self) -> list[Cohort]:
        # Newest first. Insertion order is the clock when timestamps collide.
        return list(reversed(self._cohorts))

    async def delete(self, cohort_id: UUID) -> None:
        self._cohorts = [item for item in self._cohorts if item.id != cohort_id]


class InMemoryLessonContentRepository:
    """Content keyed by lesson id.

    Returns None for a lesson nothing was seeded for, exactly like the SQL
    version does for a lesson with no material yet.
    """

    def __init__(self, contents: dict[UUID, LessonContent] | None = None) -> None:
        self._contents = dict(contents or {})

    async def get_content(self, lesson_id: UUID) -> LessonContent | None:
        return self._contents.get(lesson_id)

    def set_content(self, lesson_id: UUID, body: str, resource_ref: str | None = None) -> None:
        self._contents[lesson_id] = LessonContent(
            lesson_id=lesson_id, body=body, resource_ref=resource_ref
        )
