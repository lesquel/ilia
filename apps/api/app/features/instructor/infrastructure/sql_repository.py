"""PostgreSQL implementations of the authoring and review ports."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.orm import selectinload

from app.core.database import Database
from app.features.auth.infrastructure.models import CohortModel, UserModel
from app.features.catalog.domain.entities import Course, CourseStatus, LessonKind
from app.features.catalog.infrastructure.models import (
    CourseModel,
    LessonModel,
    ModuleModel,
)
from app.features.catalog.infrastructure.sql_repository import _to_entity as _course_to_entity
from app.features.enrollment.infrastructure.models import (
    EnrollmentModel,
    LessonProgressModel,
)
from app.features.evaluation.infrastructure.models import (
    ActivityModel,
    EvaluationModel,
    RubricDimensionModel,
    RubricModel,
    SubmissionModel,
)
from app.features.instructor.domain.ports import (
    CourseDraft,
    RosterEntry,
    SubmissionForReview,
)


class SqlAlchemyCourseWriter:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def create(self, *, draft: CourseDraft, instructor_id: UUID) -> Course:
        course_id = uuid4()

        async with self._db.session() as session:
            session.add(
                CourseModel(
                    id=course_id,
                    slug=draft.slug,
                    title=draft.title,
                    summary=draft.summary,
                    description=draft.description,
                    level=draft.level.value,
                    # Drafts, always. Publishing is a separate deliberate act.
                    status=CourseStatus.DRAFT.value,
                    instructor_id=instructor_id,
                )
            )

        loaded = await self._load(course_id)
        assert loaded is not None
        return loaded

    async def update_details(self, *, course_id: UUID, draft: CourseDraft) -> None:
        async with self._db.session() as session:
            row = await session.get(CourseModel, course_id)
            if row is None:
                return
            row.slug = draft.slug
            row.title = draft.title
            row.summary = draft.summary
            row.description = draft.description
            row.level = draft.level.value

    async def set_status(
        self, *, course_id: UUID, status: CourseStatus, published_at: datetime | None
    ) -> None:
        async with self._db.session() as session:
            row = await session.get(CourseModel, course_id)
            if row is None:
                return
            row.status = status.value
            row.published_at = published_at

    async def slug_taken(self, *, slug: str, excluding: UUID | None = None) -> bool:
        statement = select(func.count(CourseModel.id)).where(CourseModel.slug == slug)
        if excluding is not None:
            statement = statement.where(CourseModel.id != excluding)

        async with self._db.session() as session:
            return int((await session.execute(statement)).scalar_one()) > 0

    async def add_module(self, *, course_id: UUID, title: str, position: int) -> UUID:
        module_id = uuid4()
        async with self._db.session() as session:
            session.add(
                ModuleModel(id=module_id, course_id=course_id, title=title, position=position)
            )
        return module_id

    async def add_lesson(
        self,
        *,
        module_id: UUID,
        title: str,
        kind: LessonKind,
        position: int,
        duration_seconds: int,
        body: str,
    ) -> UUID:
        lesson_id = uuid4()
        async with self._db.session() as session:
            session.add(
                LessonModel(
                    id=lesson_id,
                    module_id=module_id,
                    title=title,
                    kind=kind.value,
                    position=position,
                    duration_seconds=duration_seconds,
                    body=body,
                )
            )
        return lesson_id

    async def set_lesson_media(self, *, lesson_id: UUID, reference: str | None) -> None:
        async with self._db.session() as session:
            await session.execute(
                sa_update(LessonModel)
                .where(LessonModel.id == lesson_id)
                .values(resource_ref=reference)
            )

    async def lesson_belongs_to(self, *, lesson_id: UUID, course_id: UUID) -> bool:
        async with self._db.session() as session:
            result = await session.execute(
                select(LessonModel.id)
                .join(ModuleModel, ModuleModel.id == LessonModel.module_id)
                .where(LessonModel.id == lesson_id, ModuleModel.course_id == course_id)
            )
            return result.first() is not None

    async def module_belongs_to(self, *, module_id: UUID, course_id: UUID) -> bool:
        async with self._db.session() as session:
            result = await session.execute(
                select(ModuleModel.id).where(
                    ModuleModel.id == module_id, ModuleModel.course_id == course_id
                )
            )
            return result.first() is not None

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
        activity_id = uuid4()
        rubric_id = uuid4()

        # One session, so one transaction. An activity without its rubric would
        # be an activity a teacher can open and that cannot grade them.
        async with self._db.session() as session:
            session.add(RubricModel(id=rubric_id, version=1, name=rubric_name))
            session.add_all(
                RubricDimensionModel(
                    id=uuid4(),
                    rubric_id=rubric_id,
                    key=str(dimension["key"]),
                    name=str(dimension["name"]),
                    description=str(dimension["description"]),
                    kind=str(dimension["kind"]),
                    weight=float(dimension["weight"]),  # type: ignore[arg-type]
                )
                for dimension in dimensions
            )
            session.add(
                ActivityModel(
                    id=activity_id,
                    module_id=module_id,
                    course_id=course_id,
                    rubric_id=rubric_id,
                    title=title,
                    statement=statement,
                    max_attempts=max_attempts,
                    checks=checks,
                )
            )

        return activity_id

    async def list_for_instructor(self, instructor_id: UUID) -> list[Course]:
        statement = (
            select(CourseModel, UserModel.full_name)
            .join(UserModel, UserModel.id == CourseModel.instructor_id)
            .where(CourseModel.instructor_id == instructor_id)
            .options(selectinload(CourseModel.modules).selectinload(ModuleModel.lessons))
            .order_by(CourseModel.created_at.desc())
        )

        async with self._db.session() as session:
            rows = (await session.execute(statement)).all()

        return [_course_to_entity(course, name) for course, name in rows]

    async def _load(self, course_id: UUID) -> Course | None:
        statement = (
            select(CourseModel, UserModel.full_name)
            .join(UserModel, UserModel.id == CourseModel.instructor_id)
            .where(CourseModel.id == course_id)
            .options(selectinload(CourseModel.modules).selectinload(ModuleModel.lessons))
        )

        async with self._db.session() as session:
            row = (await session.execute(statement)).first()

        if row is None:
            return None

        course, name = row
        return _course_to_entity(course, name)


class SqlAlchemyReviewReader:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def inbox_size(self, *, instructor_id: UUID, course_id: UUID | None = None) -> int:
        statement = (
            select(func.count(SubmissionModel.id))
            .join(ActivityModel, ActivityModel.id == SubmissionModel.activity_id)
            .join(CourseModel, CourseModel.id == ActivityModel.course_id)
            # Same ownership scope as the page itself. A total counted without
            # it would tell an instructor how much work exists on courses they
            # cannot see.
            .where(CourseModel.instructor_id == instructor_id)
        )

        if course_id is not None:
            statement = statement.where(ActivityModel.course_id == course_id)

        async with self._db.session() as session:
            return int((await session.execute(statement)).scalar_one())

    async def inbox(
        self,
        *,
        instructor_id: UUID,
        course_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SubmissionForReview]:
        # Scoped by the course's owner, so an instructor's inbox can only ever
        # contain submissions from courses they own.
        statement = (
            select(
                SubmissionModel,
                ActivityModel.title,
                ActivityModel.course_id,
                UserModel.full_name,
                EvaluationModel,
            )
            .join(ActivityModel, ActivityModel.id == SubmissionModel.activity_id)
            .join(CourseModel, CourseModel.id == ActivityModel.course_id)
            .join(UserModel, UserModel.id == SubmissionModel.user_id)
            .outerjoin(EvaluationModel, EvaluationModel.submission_id == SubmissionModel.id)
            .where(CourseModel.instructor_id == instructor_id)
            .order_by(SubmissionModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        if course_id is not None:
            statement = statement.where(ActivityModel.course_id == course_id)

        async with self._db.session() as session:
            rows = (await session.execute(statement)).all()

        results: list[SubmissionForReview] = []
        for submission, activity_title, activity_course_id, student_name, evaluation in rows:
            overridden = evaluation is not None and evaluation.override_total is not None

            results.append(
                SubmissionForReview(
                    submission_id=submission.id,
                    activity_id=submission.activity_id,
                    activity_title=activity_title,
                    course_id=activity_course_id,
                    student_id=submission.user_id,
                    student_name=student_name,
                    attempt=submission.attempt,
                    prompt=submission.prompt,
                    submitted_at=submission.created_at,
                    total=evaluation.total if evaluation else None,
                    effective_total=(
                        evaluation.override_total
                        if overridden
                        else (evaluation.total if evaluation else None)
                    ),
                    passed=bool(evaluation.passed) if evaluation else False,
                    was_overridden=overridden,
                )
            )

        return results


class SqlAlchemyScoreOverrideWriter:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def override(
        self,
        *,
        submission_id: UUID,
        instructor_id: UUID,
        new_total: float,
        reason: str,
        at: datetime,
    ) -> None:
        async with self._db.session() as session:
            result = await session.execute(
                select(EvaluationModel).where(EvaluationModel.submission_id == submission_id)
            )
            row = result.scalar_one_or_none()
            if row is None:
                return

            # Written beside `total`, never over it. The automatic mark, the
            # human one, who changed it and why all survive — which is what
            # makes the correction defensible in the first place.
            row.override_total = new_total
            row.override_reason = reason
            row.override_by = instructor_id
            row.override_at = at


class SqlAlchemyRosterReader:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def roster(self, course_id: UUID) -> list[RosterEntry]:
        lesson_total = (
            select(func.count(LessonModel.id))
            .select_from(ModuleModel)
            .join(LessonModel, LessonModel.module_id == ModuleModel.id)
            .where(ModuleModel.course_id == course_id)
            .scalar_subquery()
        )

        completed = (
            select(
                LessonProgressModel.enrollment_id.label("enrollment_id"),
                func.count(LessonProgressModel.id).label("done"),
                func.max(LessonProgressModel.completed_at).label("last_activity"),
            )
            .group_by(LessonProgressModel.enrollment_id)
            .subquery()
        )

        statement = (
            select(
                UserModel.id,
                UserModel.full_name,
                UserModel.email,
                EnrollmentModel.enrolled_at,
                CohortModel.name,
                func.coalesce(completed.c.done, 0),
                completed.c.last_activity,
                lesson_total,
            )
            .select_from(EnrollmentModel)
            .join(UserModel, UserModel.id == EnrollmentModel.user_id)
            .outerjoin(CohortModel, CohortModel.id == EnrollmentModel.cohort_id)
            .outerjoin(completed, completed.c.enrollment_id == EnrollmentModel.id)
            .where(EnrollmentModel.course_id == course_id)
            .order_by(EnrollmentModel.enrolled_at.desc())
        )

        async with self._db.session() as session:
            rows = (await session.execute(statement)).all()

        return [
            RosterEntry(
                user_id=row[0],
                full_name=row[1],
                email=row[2],
                enrolled_at=row[3],
                cohort_name=row[4],
                lessons_completed=int(row[5] or 0),
                lessons_total=int(row[7] or 0),
                last_activity_at=row[6],
            )
            for row in rows
        ]
