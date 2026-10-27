"""Composition root.

Everything is wired here at startup: settings, logging, middleware, error
handlers and routers. Use cases never reach for a global — they receive their
ports through dependency injection (TRD 5.1).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import Settings, get_settings
from app.core.database import Database
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import CorrelationIdMiddleware
from app.features.admin.interface.dependencies import build_admin_container
from app.features.admin.interface.router import router as admin_router
from app.features.auth.interface.dependencies import build_auth_container
from app.features.auth.interface.router import router as auth_router
from app.features.billing.interface.dependencies import build_billing_container
from app.features.billing.interface.router import router as billing_router
from app.features.catalog.interface.dependencies import build_catalog_container
from app.features.catalog.interface.router import router as catalog_router
from app.features.certificates.interface.dependencies import build_certificate_container
from app.features.certificates.interface.router import router as certificate_router
from app.features.enrollment.interface.dependencies import build_enrollment_container
from app.features.enrollment.interface.router import router as enrollment_router
from app.features.evaluation.infrastructure.queue import recover_abandoned
from app.features.evaluation.interface.dependencies import build_evaluation_container
from app.features.evaluation.interface.router import router as evaluation_router
from app.features.forum.interface.dependencies import build_forum_container
from app.features.forum.interface.router import router as forum_router
from app.features.health.interface.router import router as health_router
from app.features.instructor.interface.dependencies import build_instructor_container
from app.features.instructor.interface.router import router as instructor_router
from app.features.storage.infrastructure.registry import build_storage


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    database = Database(settings) if settings.database_url else None

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        # Pick up whatever a previous process left mid-flight. With a real
        # provider an evaluation takes seconds, so a deploy at the wrong moment
        # would otherwise leave a teacher with no feedback and a spent attempt.
        if database is not None:
            try:
                await recover_abandoned(
                    application.state.evaluation["submissions"],
                    application.state.evaluation["queue"],
                )
            except Exception:
                # Recovery is best-effort. Refusing to start because old work
                # could not be reclaimed would turn a small problem into an
                # outage for everyone.
                structlog.get_logger().exception("evaluation_recovery_failed")

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
    app.state.evaluation = build_evaluation_container(settings, database)
    app.state.certificates = build_certificate_container(settings, database)
    app.state.forum = build_forum_container(settings, database)
    app.state.instructor = build_instructor_container(settings, database)
    app.state.admin = build_admin_container(settings, database)
    app.state.billing = build_billing_container(settings, database)

    # The evaluation quota runs on plans once billing is configured. Wired here,
    # at the composition root, so neither feature imports the other's container.
    if "plans" in app.state.billing:
        from app.features.billing.application.use_cases import (
            GetEntitlements,
            PlanQuotaPolicy,
        )

        app.state.evaluation["quota"] = PlanQuotaPolicy(
            entitlements=GetEntitlements(
                plans=app.state.billing["plans"],
                subscriptions=app.state.billing["subscriptions"],
                counter=app.state.billing["counter"],
                clock=app.state.auth["clock"],
            ),
            users=app.state.auth["users"],
        )

    # One storage provider for the whole app, built at startup so a
    # misconfiguration surfaces there and not when a teacher presses play.
    app.state.storage = build_storage(settings)

    # Serve the local media directory only when the local adapter is in use, and
    # never in production — `build_storage` refuses the local adapter there, so
    # this cannot mount by accident.
    if getattr(app.state.storage, "provider", "") == "local":
        directory = Path(settings.storage_local_dir)
        try:
            directory.mkdir(parents=True, exist_ok=True)
            app.mount("/media", StaticFiles(directory=directory), name="media")
        except OSError:
            # A read-only filesystem, which is what a container should have.
            # Refusing to boot over a development-only convenience would take
            # the whole API down for a storage setting that is already wrong;
            # media calls fail with an honest 503 instead.
            structlog.get_logger().warning(
                "local_media_directory_unavailable",
                detail=(
                    "Could not create the local media directory. Set "
                    "ILIA_STORAGE_PROVIDER for anything but local development"
                ),
            )

    app.include_router(health_router)
    app.include_router(auth_router, prefix=settings.api_prefix)
    app.include_router(catalog_router, prefix=settings.api_prefix)
    app.include_router(enrollment_router, prefix=settings.api_prefix)
    app.include_router(evaluation_router, prefix=settings.api_prefix)
    app.include_router(certificate_router, prefix=settings.api_prefix)
    app.include_router(forum_router, prefix=settings.api_prefix)
    app.include_router(instructor_router, prefix=settings.api_prefix)
    app.include_router(admin_router, prefix=settings.api_prefix)
    app.include_router(billing_router, prefix=settings.api_prefix)

    _mount_exported_web(app)

    return app


def _mount_exported_web(app: FastAPI) -> None:
    """Serve the Expo web export from the API host when the build produced one.

    The session cookie is host-only, so the pages and `/api/v1` have to be the
    same origin. The directory is absent in local development and in tests.
    """
    export_dir = Path(__file__).resolve().parents[1] / "web-dist"
    index_file = export_dir / "index.html"
    if not index_file.is_file():
        return

    export_root = export_dir.resolve()

    @app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    @app.api_route("/{requested_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def exported_web(requested_path: str = "") -> FileResponse:
        candidate = (export_root / requested_path).resolve()
        inside_export = candidate == export_root or export_root in candidate.parents
        if candidate.is_file() and inside_export:
            return FileResponse(candidate)
        return FileResponse(index_file)


app = create_app()
