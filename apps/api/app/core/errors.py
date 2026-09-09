"""HTTP translation of domain errors.

This is the only place in the codebase that knows a `ConflictError` is a 409.
The domain stays unaware that it is being served over HTTP.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.shared.errors import (
    AuthenticationError,
    ConflictError,
    DomainError,
    NotFoundError,
    PermissionDeniedError,
    QuotaExceededError,
    UnavailableError,
    ValidationError,
)

_STATUS_BY_ERROR: dict[type[DomainError], int] = {
    ValidationError: 422,
    AuthenticationError: 401,
    PermissionDeniedError: 403,
    NotFoundError: 404,
    ConflictError: 409,
    QuotaExceededError: 429,
    UnavailableError: 503,
}


def _status_for(exc: DomainError) -> int:
    """Resolve the status by walking the exception's own class hierarchy.

    An exact `type(exc)` lookup would quietly downgrade every subclass to 400 —
    `InvalidCredentialsError` is an `AuthenticationError`, not literally one, and
    a 400 there would stop the client from ever sending the user back to login.
    """
    for klass in type(exc).__mro__:
        if klass in _STATUS_BY_ERROR:
            return _STATUS_BY_ERROR[klass]
    return 400


def _envelope(code: str, message: str, detail: object = None) -> dict[str, object]:
    """Uniform error shape across every endpoint (TRD 8)."""
    return {"error": {"code": code, "message": message, "detail": detail or {}}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(_: Request, exc: DomainError) -> JSONResponse:
        status = _status_for(exc)
        headers = {}

        # A 429 without Retry-After leaves the client guessing, and a client
        # that guesses retries too soon and stays locked out.
        retry_after = getattr(exc, "retry_after_seconds", None)
        if retry_after is not None:
            headers["Retry-After"] = str(int(retry_after))

        return JSONResponse(
            status_code=status,
            content=_envelope(exc.code, exc.message, exc.detail),
            headers=headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def _schema(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_envelope("schema_error", "Request body is invalid", exc.errors()),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope("http_error", str(exc.detail)),
        )
