"""PostgreSQL implementation of the evaluation ports."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.orm import selectinload

from app.core.database import Database
from app.features.evaluation.domain.checks import CheckSpec
from app.features.evaluation.domain.entities import (
    MAX_RECOVERIES,
    Activity,
    Evaluation,
    Submission,
    SubmissionStatus,
)
from app.features.evaluation.domain.rubric import Dimension, DimensionKind, Rubric
from app.features.evaluation.domain.scoring import DimensionScore

from .models import (
    ActivityModel,
    EvaluationModel,
    EvaluationScoreModel,
    LlmUsageModel,
    RubricModel,
    SubmissionModel,
)


def _to_check_spec(raw: dict) -> CheckSpec:  # type: ignore[type-arg]
    """Rebuild the check spec from JSON.

    Unknown keys are ignored rather than fatal: a spec written by a newer
    version of the app must not stop an older worker from grading.
    """
    return CheckSpec(
        required_terms=[list(group) for group in raw.get("required_terms", [])],
        min_length=int(raw.get("min_length", 0)),
        max_length=int(raw.get("max_length", 0)),
        requires_format=bool(raw.get("requires_format", False)),
        requires_role=bool(raw.get("requires_role", False)),
    )


def _to_rubric(row: RubricModel) -> Rubric:
    return Rubric(
        id=row.id,
        version=row.version,
        dimensions=[
            Dimension(
                id=dimension.id,
                key=dimension.key,
                name=dimension.name,
                description=dimension.description,
                kind=DimensionKind(dimension.kind),
                weight=dimension.weight,
            )
            for dimension in row.dimensions
        ],
    )


def _to_activity(row: ActivityModel) -> Activity:
    return Activity(
        id=row.id,
        module_id=row.module_id,
        course_id=row.course_id,
        title=row.title,
        statement=row.statement,
        rubric=_to_rubric(row.rubric),
        checks=_to_check_spec(row.checks or {}),
        max_attempts=row.max_attempts,
    )


class SqlAlchemyActivityRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def get(self, activity_id: UUID) -> Activity | None:
        statement = (
            select(ActivityModel)
            .where(ActivityModel.id == activity_id)
            .options(selectinload(ActivityModel.rubric).selectinload(RubricModel.dimensions))
        )

        async with self._db.session() as session:
            row = (await session.execute(statement)).scalar_one_or_none()

        return _to_activity(row) if row else None

    async def get_by_module(self, module_id: UUID) -> list[Activity]:
        statement = (
            select(ActivityModel)
            .where(ActivityModel.module_id == module_id)
            .options(selectinload(ActivityModel.rubric).selectinload(RubricModel.dimensions))
        )

        async with self._db.session() as session:
            rows = (await session.execute(statement)).scalars().all()

        return [_to_activity(row) for row in rows]


def _to_submission(row: SubmissionModel) -> Submission:
    return Submission(
        id=row.id,
        activity_id=row.activity_id,
        user_id=row.user_id,
        prompt=row.prompt,
        attempt=row.attempt,
        status=SubmissionStatus(row.status),
        recoveries=row.recoveries,
        updated_at=row.updated_at,
        created_at=row.created_at,
        failure_reason=row.failure_reason,
    )


class SqlAlchemySubmissionRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def add(self, submission: Submission) -> None:
        async with self._db.session() as session:
            session.add(
                SubmissionModel(
                    id=submission.id,
                    activity_id=submission.activity_id,
                    user_id=submission.user_id,
                    prompt=submission.prompt,
                    attempt=submission.attempt,
                    status=submission.status.value,
                    created_at=submission.created_at,
                )
            )

    async def get(self, submission_id: UUID) -> Submission | None:
        async with self._db.session() as session:
            row = await session.get(SubmissionModel, submission_id)
            return _to_submission(row) if row else None

    async def update(self, submission: Submission) -> None:
        async with self._db.session() as session:
            row = await session.get(SubmissionModel, submission.id)
            if row is None:
                return
            row.status = submission.status.value
            row.failure_reason = submission.failure_reason
            row.recoveries = submission.recoveries

    async def count_attempts(self, *, user_id: UUID, activity_id: UUID) -> int:
        async with self._db.session() as session:
            result = await session.execute(
                select(func.count(SubmissionModel.id)).where(
                    SubmissionModel.user_id == user_id,
                    SubmissionModel.activity_id == activity_id,
                    # Our failures are not the teacher's attempts.
                    SubmissionModel.status != SubmissionStatus.FAILED.value,
                )
            )
            return int(result.scalar_one())

    async def claim_abandoned(self, *, older_than: datetime, limit: int) -> list[UUID]:
        stale = (
            select(SubmissionModel.id)
            .where(
                SubmissionModel.status.in_(
                    [SubmissionStatus.PENDING.value, SubmissionStatus.RUNNING.value]
                ),
                SubmissionModel.updated_at < older_than,
                SubmissionModel.recoveries < MAX_RECOVERIES,
            )
            .order_by(SubmissionModel.created_at)
            .limit(limit)
            # The whole point. Without SKIP LOCKED two replicas booting together
            # would each select the same rows and each run the evaluation.
            .with_for_update(skip_locked=True)
        )

        async with self._db.session() as session:
            result = await session.execute(
                sa_update(SubmissionModel)
                .where(SubmissionModel.id.in_(stale.scalar_subquery()))
                .values(
                    status=SubmissionStatus.PENDING.value,
                    recoveries=SubmissionModel.recoveries + 1,
                    updated_at=func.now(),
                )
                .returning(SubmissionModel.id)
            )
            return [row[0] for row in result.all()]

    async def claim_exhausted(self, *, older_than: datetime, limit: int) -> list[UUID]:
        async with self._db.session() as session:
            result = await session.execute(
                select(SubmissionModel.id)
                .where(
                    SubmissionModel.status.in_(
                        [SubmissionStatus.PENDING.value, SubmissionStatus.RUNNING.value]
                    ),
                    SubmissionModel.updated_at < older_than,
                    SubmissionModel.recoveries >= MAX_RECOVERIES,
                )
                .limit(limit)
            )
            return [row[0] for row in result.all()]

    async def give_up(self, submission_id: UUID, *, reason: str) -> None:
        async with self._db.session() as session:
            await session.execute(
                sa_update(SubmissionModel)
                .where(SubmissionModel.id == submission_id)
                .values(
                    status=SubmissionStatus.FAILED.value,
                    failure_reason=reason[:120],
                    updated_at=func.now(),
                )
            )

    async def list_for_activity(self, *, user_id: UUID, activity_id: UUID) -> list[Submission]:
        async with self._db.session() as session:
            result = await session.execute(
                select(SubmissionModel)
                .where(
                    SubmissionModel.user_id == user_id,
                    SubmissionModel.activity_id == activity_id,
                )
                .order_by(SubmissionModel.attempt)
            )
            return [_to_submission(row) for row in result.scalars()]


class SqlAlchemyEvaluationRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def add(self, evaluation: Evaluation) -> None:
        async with self._db.session() as session:
            row = EvaluationModel(
                id=evaluation.id,
                submission_id=evaluation.submission_id,
                rubric_version=evaluation.rubric_version,
                total=evaluation.total,
                passed=evaluation.passed,
                feedback=evaluation.feedback,
                suggestion=evaluation.suggestion,
                check_failures=list(evaluation.check_failures),
                model=evaluation.model,
                model_version=evaluation.model_version,
                evaluated_at=evaluation.evaluated_at,
            )
            row.scores = [
                EvaluationScoreModel(
                    id=uuid4(),
                    dimension_key=score.key,
                    score=score.score,
                    justification=score.justification,
                )
                for score in evaluation.dimension_scores
            ]
            session.add(row)

    async def get_for_submission(self, submission_id: UUID) -> Evaluation | None:
        statement = (
            select(EvaluationModel)
            .where(EvaluationModel.submission_id == submission_id)
            .options(selectinload(EvaluationModel.scores))
        )

        async with self._db.session() as session:
            row = (await session.execute(statement)).scalar_one_or_none()

        if row is None:
            return None

        return Evaluation(
            id=row.id,
            submission_id=row.submission_id,
            rubric_version=row.rubric_version,
            total=row.total,
            passed=row.passed,
            dimension_scores=[
                DimensionScore(
                    key=score.dimension_key,
                    score=score.score,
                    justification=score.justification or "Sin justificación.",
                )
                for score in row.scores
            ],
            feedback=row.feedback,
            suggestion=row.suggestion,
            check_failures=list(row.check_failures or []),
            model=row.model,
            model_version=row.model_version,
            evaluated_at=row.evaluated_at,
            override_total=row.override_total,
            override_reason=row.override_reason,
            override_by=row.override_by,
        )


class SqlAlchemyUsageRecorder:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def record(
        self,
        *,
        user_id: UUID,
        submission_id: UUID,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        async with self._db.session() as session:
            session.add(
                LlmUsageModel(
                    id=uuid4(),
                    user_id=user_id,
                    submission_id=submission_id,
                    model=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )
            )
