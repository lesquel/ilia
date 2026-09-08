"""Composition root.

Everything is wired here at startup: settings, logging, middleware, error
handlers and routers. Use cases never reach for a global — they receive their
ports through dependency injection (TRD 5.1).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import CorrelationIdMiddleware
from app.features.auth.interface.dependencies import build_auth_container
from app.features.auth.interface.router import router as auth_router
from app.features.health.interface.router import router as health_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
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
    app.state.auth = build_auth_container(settings)

    app.include_router(health_router)
    app.include_router(auth_router, prefix=settings.api_prefix)

    return app


app = create_app()
