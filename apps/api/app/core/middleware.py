"""Cross-cutting HTTP middleware."""

import time
import uuid
from typing import TYPE_CHECKING

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp, Receive, Scope, Send

if TYPE_CHECKING:
    from app.core.database import Database
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_HEADER = "X-Request-Id"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Bind a correlation id to every log line of a request (TRD 12).

    Without this, an evaluation that spans an HTTP call, a queue job and an LLM
    round-trip cannot be reconstructed from the logs — and a teacher disputing
    their grade is exactly the case where that reconstruction is needed.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        correlation_id = request.headers.get(CORRELATION_HEADER) or str(uuid.uuid4())

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=correlation_id,
            method=request.method,
            path=request.url.path,
        )

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000

        structlog.get_logger().info(
            "http_request",
            status_code=response.status_code,
            duration_ms=round(elapsed_ms, 2),
        )
        response.headers[CORRELATION_HEADER] = correlation_id
        return response


class RequestSessionMiddleware:
    """Open one shared database session for each HTTP request.

    A plain ASGI middleware, not `BaseHTTPMiddleware`: that one runs the rest
    of the app in another task, and the shared session belongs to the task
    that serves the request. It must therefore sit inside every
    `BaseHTTPMiddleware` (added first, so it ends up innermost).
    """

    def __init__(self, app: ASGIApp, database: "Database | None") -> None:
        self.app = app
        self.database = database

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or self.database is None:
            await self.app(scope, receive, send)
            return
        async with self.database.request_scope():
            await self.app(scope, receive, send)
