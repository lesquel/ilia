"""PostgreSQL implementation of the enrollment and progress ports."""

from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError

from app.core.database import Database
from app.features.auth.infrastructure.models import CohortModel
from app.features.catalog.infrastructure.models import LessonModel
from app.features.enrollment.domain.entities import Enrollment, LessonContent
from app.features.enrollment.domain.errors import AlreadyEnrolledError
from app.features.evaluation.infrastructure.models import (
    ActivityModel,
    EvaluationModel,
    SubmissionModel,
)

from .models import EnrollmentModel, LessonProgressModel


def _to_entity(row: EnrollmentModel) -> Enrollment:
    return Enrollment(
        id=row.id,
        user_id=row.user_id,
        course_id=row.course_id,
        enrolled_at=row.enrolled_at,
        cohort_id=row.cohort_id,
    )


class SqlAlchemyEnrollmentRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def get(self, *, user_id: UUID, course_id: UUID) -> Enrollment | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(EnrollmentModel).where(
                    EnrollmentModel.user_id == user_id,
                    EnrollmentModel.course_id == course_id,
                )
            )
            row = result.scalar_one_or_none()
            return _to_entity(row) if row else None

    async def add(self, enrollment: Enrollment) -> None:
        try:
            async with self._db.session() as session:
                session.add(
                    EnrollmentModel(
                        id=enrollment.id,
                        user_id=enrollment.user_id,
                        course_id=enrollment.course_id,
                        cohort_id=enrollment.cohort_id,
                        enrolled_at=enrollment.enrolled_at,
                    )
                )
        except IntegrityError as exc:
            # Two taps racing past the application's check. The unique
            # constraint caught it; turn it into the domain's own error.
            raise AlreadyEnrolledError() from exc

    async def list_for_user(self, user_id: UUID) -> list[Enrollment]:
        async with self._db.session() as session:
            result = await session.execute(
                select(EnrollmentModel)
                .where(EnrollmentModel.user_id == user_id)
                .order_by(EnrollmentModel.enrolled_at.desc())
            )
            return [_to_entity(row) for row in result.scalars()]


class SqlAlchemyProgressRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def completed_lesson_ids(self, enrollment_id: UUID) -> set[UUID]:
        async with self._db.session() as session:
            result = await session.execute(
                select(LessonProgressModel.lesson_id).where(
                    LessonProgressModel.enrollment_id == enrollment_id
                )
            )
            return set(result.scalars())

    async def completed_by_enrollment(self, enrollment_ids: list[UUID]) -> dict[UUID, set[UUID]]:
        if not enrollment_ids:
            return {}

        # One query for every enrollment. "Mis cursos" is the screen a teacher
        # opens first and most often; a query per course there is the N+1 that
        # actually gets noticed.
        async with self._db.session() as session:
            result = await session.execute(
                select(LessonProgressModel.enrollment_id, LessonProgressModel.lesson_id).where(
                    LessonProgressModel.enrollment_id.in_(enrollment_ids)
                )
            )
            rows = result.all()

        completions: dict[UUID, set[UUID]] = {}
        for enrollment_id, lesson_id in rows:
            completions.setdefault(enrollment_id, set()).add(lesson_id)

        return completions

    async def passed_activity_ids(self, *, user_id: UUID, course_id: UUID) -> set[UUID]:
        """Activities passed in this course, by any attempt.

        The same rule the certificate criteria use, deliberately: a syllabus
        that marked an activity done and a certificate that said it was not
        would be two answers to one question.
        """
        async with self._db.session() as session:
            rows = await session.execute(
                select(func.distinct(SubmissionModel.activity_id))
                .select_from(SubmissionModel)
                .join(EvaluationModel, EvaluationModel.submission_id == SubmissionModel.id)
                .join(ActivityModel, ActivityModel.id == SubmissionModel.activity_id)
                .where(
                    SubmissionModel.user_id == user_id,
                    ActivityModel.course_id == course_id,
                    EvaluationModel.passed.is_(True),
                )
            )
            return {row[0] for row in rows.all()}

    async def mark_completed(self, *, enrollment_id: UUID, lesson_id: UUID) -> None:
        # ON CONFLICT DO NOTHING rather than select-then-insert: idempotent in a
        # single round trip, and immune to two concurrent requests racing.
        statement = (
            pg_insert(LessonProgressModel)
            .values(id=uuid4(), enrollment_id=enrollment_id, lesson_id=lesson_id)
            .on_conflict_do_nothing(constraint="uq_progress_enrollment_lesson")
        )

        async with self._db.session() as session:
            await session.execute(statement)


class SqlAlchemyCohortRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def id_for_code(self, code: str) -> UUID | None:
        async with self._db.session() as session:
            result = await session.execute(select(CohortModel.id).where(CohortModel.code == code))
            return result.scalar_one_or_none()


class SqlAlchemyLessonContentRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def get_content(self, lesson_id: UUID) -> LessonContent | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(LessonModel.body, LessonModel.resource_ref).where(
                    LessonModel.id == lesson_id
                )
            )
            row = result.first()

        if row is None:
            return None

        body, resource_ref = row
        return LessonContent(lesson_id=lesson_id, body=body, resource_ref=resource_ref)
