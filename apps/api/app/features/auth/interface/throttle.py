"""Rate limiting for the endpoints that hand out or change credentials.

**Which key to count.** Per client address, not per email address. Counting per
email lets anyone lock a teacher out of their own account by failing to log in
as them ten times — turning a defence into a denial-of-service tool aimed at the
person it was meant to protect.

The cost is that a whole school behind one NAT shares a budget. Ten attempts in
five minutes is set high enough that ordinary forgetfulness does not reach it,
and a school hitting it repeatedly is worth a conversation anyway.
"""

import structlog
from fastapi import Request

from app.core.config import Settings
from app.core.rate_limit import SlidingWindowLimiter

logger = structlog.get_logger()


def build_auth_limiter(settings: Settings) -> SlidingWindowLimiter:
    return SlidingWindowLimiter(
        limit=settings.auth_rate_limit_attempts,
        window_seconds=float(settings.auth_rate_limit_window_seconds),
    )


def client_key(request: Request) -> str:
    """Who is being counted.

    `X-Forwarded-For` is trusted only when the deployment sets it, which is why
    the leftmost entry is used: behind our own proxy that is the real client.
    Directly exposed, the header is attacker-controlled and the socket address
    is the honest answer — so a deployment without a proxy must not send it.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


def enforce(request: Request, *, action: str) -> None:
    """Count this attempt against the caller's budget."""
    limiter: SlidingWindowLimiter = request.app.state.auth["limiter"]
    key = f"{action}:{client_key(request)}"

    try:
        limiter.check(key)
    except Exception:
        # Logged without the key: an address is personal data, and this line
        # exists to show that the limiter is working, not who was behind it.
        logger.warning("auth_rate_limited", action=action)
        raise


def forget(request: Request, *, action: str) -> None:
    """Clear the caller's history after a success.

    Someone who mistyped their password four times and then got it right should
    not spend the next five minutes one attempt from a lockout.
    """
    limiter: SlidingWindowLimiter = request.app.state.auth["limiter"]
    limiter.reset(f"{action}:{client_key(request)}")
