"""Liveness and readiness endpoints.

Deliberately outside the versioned API prefix: orchestrators and uptime checks
should not have to follow our API versioning.

**Why these are two endpoints and not one.** They answer different questions and
the orchestrator does different things with the answers:

- `/health` asks "is this process alive?" and depends on nothing. A failure here
  means restart me.
- `/health/ready` asks "can this process serve a request?" and checks the
  database. A failure here means stop sending me traffic — but do **not**
  restart me, because the problem is not in here.

Conflating them is how a database blip becomes a restart loop across every
replica at once, which turns a short outage into a long one.
"""

from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import Settings, get_app_settings

router = APIRouter(tags=["health"])

VERSION = "0.1.0"


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str


class ReadinessResponse(BaseModel):
    status: str
    database: str
    # What the process would grade and store with, so a deploy can be checked
    # without reading its environment variables.
    llm: str
    storage: str


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    """Liveness. Answers as long as the process can answer at all."""
    settings: Settings = get_app_settings(request)
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        version=VERSION,
    )


@router.get("/health/ready", response_model=ReadinessResponse)
async def ready(request: Request, response: Response) -> ReadinessResponse:
    """Readiness. Actually touches the database.

    `SELECT 1` rather than a connection count or a pool statistic: what matters
    is whether a query completes, and only a query proves that.
    """
    settings: Settings = get_app_settings(request)
    database = request.app.state.database

    if database is None:
        # In-memory repositories. Honest rather than reassuring: this process
        # forgets everything on restart, and calling it "ready" would hide that.
        database_status = "unconfigured"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        try:
            async with database.session() as session:
                await session.execute(text("SELECT 1"))
            database_status = "ok"
        except Exception:
            # The reason is not returned: an error from the driver can carry the
            # connection string, and this endpoint is reachable without
            # credentials. It is logged by the middleware either way.
            database_status = "unreachable"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return ReadinessResponse(
        status="ok" if response.status_code != status.HTTP_503_SERVICE_UNAVAILABLE else "degraded",
        database=database_status,
        # Names only, never keys. "local-stub" here is how you notice a
        # deployment that is not really grading anything.
        llm=settings.llm_provider or "local-stub",
        storage=settings.storage_provider or "local",
    )
