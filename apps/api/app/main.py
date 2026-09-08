"""Composition root.

Everything is wired here at startup: settings, logging, middleware, error
handlers and routers. Use cases never reach for a global — they receive their
ports through dependency injection (TRD 5.1).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.database import Database
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import CorrelationIdMiddleware
from app.features.auth.interface.dependencies import build_auth_container
from app.features.auth.interface.router import router as auth_router
from app.features.catalog.interface.dependencies import build_catalog_container
from app.features.catalog.interface.router import router as catalog_router
from app.features.enrollment.interface.dependencies import build_enrollment_container
from app.features.enrollment.interface.router import router as enrollment_router
from app.features.health.interface.router import router as health_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    database = Database(settings) if settings.database_url else None

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        if database is not None:
            await database.dispose()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    # Singletons built once here, injected per request. A use case never reaches
    # for a global.
    app.state.settings = settings
    app.state.database = database
    app.state.auth = build_auth_container(settings, database)
    app.state.catalog = build_catalog_container(settings, database)
    app.state.enrollment = build_enrollment_container(settings, database)

    app.include_router(health_router)
    app.include_router(auth_router, prefix=settings.api_prefix)
    app.include_router(catalog_router, prefix=settings.api_prefix)
    app.include_router(enrollment_router, prefix=settings.api_prefix)

    return app


app = create_app()
