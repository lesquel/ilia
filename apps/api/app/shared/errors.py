"""Domain error hierarchy.

Pure Python: no framework, no ORM, no HTTP. The interface layer is what maps
these onto status codes, which is why the domain can raise them freely without
knowing it is being served over HTTP.

`code` is a stable machine-readable identifier. It is intentionally not a
user-facing message: the client owns the wording and the language.
"""

from typing import Any


class DomainError(Exception):
    """Base class for every expected failure in the domain."""

    code: str = "domain_error"

    def __init__(self, message: str, *, detail: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail or {}


class NotFoundError(DomainError):
    """The requested entity does not exist, or the caller may not know it does."""

    code = "not_found"


class ValidationError(DomainError):
    """Input violates a domain rule. Distinct from schema validation, which the
    interface layer rejects before a use case ever runs."""

    code = "validation_error"


class ConflictError(DomainError):
    """The operation contradicts the current state (duplicate email, already
    enrolled, activity already submitted for this attempt)."""

    code = "conflict"


class AuthenticationError(DomainError):
    """The caller could not be identified: no credentials, or bad ones.

    Distinct from PermissionDeniedError, which means "we know who you are and
    the answer is still no". The client reacts differently to each: one sends
    you to the login screen, the other does not.
    """

    code = "unauthenticated"


class PermissionDeniedError(DomainError):
    """The caller is authenticated but not allowed to perform this action.

    Ownership rules ("is this *my* course?") raise this from the application
    layer; role checks raise it from the interface layer. Both end up here.
    """

    code = "permission_denied"


class QuotaExceededError(DomainError):
    """The user ran out of allowance under their plan.

    Its own type rather than a ConflictError because it is the main lever of the
    freemium tier (PRD 11) and the client must be able to react to it specifically.
    """

    code = "quota_exceeded"


class UnavailableError(DomainError):
    """A dependency the domain relies on (LLM provider, storage) is unreachable."""

    code = "unavailable"
