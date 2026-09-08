"""Liveness and readiness endpoints.

Deliberately outside the versioned API prefix: orchestrators and uptime checks
should not have to follow our API versioning.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.config import Settings, get_app_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings: Settings = get_app_settings(request)
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        version="0.1.0",
    )
