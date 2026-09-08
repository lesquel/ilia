from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.enrollment.domain.ports import (
    CohortRepository,
    EnrollmentRepository,
    LessonContentRepository,
    ProgressRepository,
)
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryLessonContentRepository,
    InMemoryProgressRepository,
)
from app.features.enrollment.infrastructure.sql_repository import (
    SqlAlchemyCohortRepository,
    SqlAlchemyEnrollmentRepository,
    SqlAlchemyLessonContentRepository,
    SqlAlchemyProgressRepository,
)


def build_enrollment_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is not None:
        return {
            "enrollments": SqlAlchemyEnrollmentRepository(database),
            "progress": SqlAlchemyProgressRepository(database),
            "cohorts": SqlAlchemyCohortRepository(database),
            "contents": SqlAlchemyLessonContentRepository(database),
        }

    structlog.get_logger().warning(
        "enrollment_using_in_memory_repositories",
        detail="ILIA_DATABASE_URL is not set; enrollments and progress will be lost on restart",
    )
    return {
        "enrollments": InMemoryEnrollmentRepository(),
        "progress": InMemoryProgressRepository(),
        "cohorts": InMemoryCohortRepository(),
        "contents": InMemoryLessonContentRepository(),
    }


def get_enrollment_repository(request: Request) -> EnrollmentRepository:
    return request.app.state.enrollment["enrollments"]  # type: ignore[no-any-return]


def get_progress_repository(request: Request) -> ProgressRepository:
    return request.app.state.enrollment["progress"]  # type: ignore[no-any-return]


def get_cohort_repository(request: Request) -> CohortRepository:
    return request.app.state.enrollment["cohorts"]  # type: ignore[no-any-return]


EnrollmentsDep = Annotated[EnrollmentRepository, Depends(get_enrollment_repository)]
ProgressDep = Annotated[ProgressRepository, Depends(get_progress_repository)]


def get_lesson_content_repository(request: Request) -> LessonContentRepository:
    return request.app.state.enrollment["contents"]  # type: ignore[no-any-return]


CohortsDep = Annotated[CohortRepository, Depends(get_cohort_repository)]
ContentsDep = Annotated[LessonContentRepository, Depends(get_lesson_content_repository)]
