"""Cross-cutting HTTP middleware."""

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
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
