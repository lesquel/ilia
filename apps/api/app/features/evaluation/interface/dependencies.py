from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.auth.infrastructure.security import SystemClock
from app.features.evaluation.application.use_cases import RunEvaluation
from app.features.evaluation.domain.ports import (
    ActivityRepository,
    EvaluationQueue,
    EvaluationRepository,
    QuotaPolicy,
    SubmissionRepository,
)
from app.features.evaluation.infrastructure.local_provider import (
    LocalPromptExecutor,
    LocalPromptJudge,
)
from app.features.evaluation.infrastructure.memory_repository import (
    InMemoryActivityRepository,
    InMemoryEvaluationRepository,
    InMemorySubmissionRepository,
    InMemoryUsageRecorder,
    UnlimitedQuota,
)
from app.features.evaluation.infrastructure.queue import InProcessEvaluationQueue
from app.features.evaluation.infrastructure.sql_repository import (
    SqlAlchemyActivityRepository,
    SqlAlchemyEvaluationRepository,
    SqlAlchemySubmissionRepository,
    SqlAlchemyUsageRecorder,
)


def build_evaluation_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is not None:
        activities: ActivityRepository = SqlAlchemyActivityRepository(database)
        submissions: SubmissionRepository = SqlAlchemySubmissionRepository(database)
        evaluations: EvaluationRepository = SqlAlchemyEvaluationRepository(database)
        usage: object = SqlAlchemyUsageRecorder(database)
    else:
        structlog.get_logger().warning(
            "evaluation_using_in_memory_repositories",
            detail="ILIA_DATABASE_URL is not set; submissions will be lost on restart",
        )
        activities = InMemoryActivityRepository()
        submissions = InMemorySubmissionRepository()
        evaluations = InMemoryEvaluationRepository()
        usage = InMemoryUsageRecorder()

    # No provider is configured yet (TRD 2.6), so the pipeline runs against the
    # local stub. It produces schema-valid output and grades nothing — the
    # feedback it returns says so out loud.
    executor = LocalPromptExecutor()
    judge = LocalPromptJudge()

    run = RunEvaluation(
        activities=activities,
        submissions=submissions,
        evaluations=evaluations,
        executor=executor,
        judge=judge,
        usage=usage,  # type: ignore[arg-type]
        clock=SystemClock(),
    )

    return {
        "activities": activities,
        "submissions": submissions,
        "evaluations": evaluations,
        "usage": usage,
        # Unlimited by default. `create_app` swaps in the plan-backed policy at
        # startup when billing is configured, so neither feature has to import
        # the other's container.
        "quota": UnlimitedQuota(),
        "run": run,
        "queue": InProcessEvaluationQueue(run.execute),
    }


def get_activities(request: Request) -> ActivityRepository:
    return request.app.state.evaluation["activities"]  # type: ignore[no-any-return]


def get_submissions(request: Request) -> SubmissionRepository:
    return request.app.state.evaluation["submissions"]  # type: ignore[no-any-return]


def get_evaluations(request: Request) -> EvaluationRepository:
    return request.app.state.evaluation["evaluations"]  # type: ignore[no-any-return]


def get_quota(request: Request) -> QuotaPolicy:
    return request.app.state.evaluation["quota"]  # type: ignore[no-any-return]


def get_queue(request: Request) -> EvaluationQueue:
    return request.app.state.evaluation["queue"]  # type: ignore[no-any-return]


ActivitiesDep = Annotated[ActivityRepository, Depends(get_activities)]
SubmissionsDep = Annotated[SubmissionRepository, Depends(get_submissions)]
EvaluationsDep = Annotated[EvaluationRepository, Depends(get_evaluations)]
QuotaDep = Annotated[QuotaPolicy, Depends(get_quota)]
QueueDep = Annotated[EvaluationQueue, Depends(get_queue)]
