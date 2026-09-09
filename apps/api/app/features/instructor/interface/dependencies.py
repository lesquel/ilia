from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.instructor.domain.ports import (
    CourseWriter,
    ReviewReader,
    RosterReader,
    ScoreOverrideWriter,
)
from app.features.instructor.infrastructure.sql_repository import (
    SqlAlchemyCourseWriter,
    SqlAlchemyReviewReader,
    SqlAlchemyRosterReader,
    SqlAlchemyScoreOverrideWriter,
)


def build_instructor_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is None:
        # Authoring writes to tables. Without a database there is nothing
        # coherent to fake, so the container is empty and the routes fail
        # loudly rather than pretending to save a course.
        structlog.get_logger().warning(
            "instructor_unavailable_without_database",
            detail="ILIA_DATABASE_URL is not set; authoring endpoints will not work",
        )
        return {}

    return {
        "writer": SqlAlchemyCourseWriter(database),
        "reviews": SqlAlchemyReviewReader(database),
        "overrides": SqlAlchemyScoreOverrideWriter(database),
        "roster": SqlAlchemyRosterReader(database),
    }


def _require(request: Request, key: str) -> object:
    container = request.app.state.instructor
    if key not in container:
        from app.shared.errors import UnavailableError

        raise UnavailableError("Authoring requires a configured database")
    return container[key]


def get_writer(request: Request) -> CourseWriter:
    return _require(request, "writer")  # type: ignore[return-value]


def get_reviews(request: Request) -> ReviewReader:
    return _require(request, "reviews")  # type: ignore[return-value]


def get_overrides(request: Request) -> ScoreOverrideWriter:
    return _require(request, "overrides")  # type: ignore[return-value]


def get_roster(request: Request) -> RosterReader:
    return _require(request, "roster")  # type: ignore[return-value]


WriterDep = Annotated[CourseWriter, Depends(get_writer)]
ReviewsDep = Annotated[ReviewReader, Depends(get_reviews)]
OverridesDep = Annotated[ScoreOverrideWriter, Depends(get_overrides)]
RosterDep = Annotated[RosterReader, Depends(get_roster)]
