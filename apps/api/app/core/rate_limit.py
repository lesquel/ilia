"""A fixed-window rate limiter for the endpoints that hand out credentials.

**What this is for.** `argon2` makes each login attempt expensive on purpose,
but nothing stopped an attacker from making millions of them against teachers'
accounts. This closes that.

**What it is not.** It counts in this process's memory, so N replicas allow N
times the limit, and a restart forgets everything. That is a real limitation and
it is deliberate: the shared-store decision (Redis, or the queue technology of
TRD 5.2) is still open, and an in-process limiter that works today beats a
perfect one that ships never. The interface below does not change when that
decision arrives — only the counter behind it does.
"""

import time
from collections import deque
from dataclasses import dataclass, field
from threading import Lock

from app.shared.errors import QuotaExceededError


class RateLimitedError(QuotaExceededError):
    """Too many attempts from one source in too little time.

    A `QuotaExceededError` rather than a new branch in the status map: both
    mean "you may not do that again yet", and both are a 429.
    """

    code = "too_many_attempts"

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__("Too many attempts. Try again in a moment")
        self.retry_after_seconds = retry_after_seconds


@dataclass
class SlidingWindowLimiter:
    """At most `limit` events per `window_seconds`, per key.

    A sliding window rather than a fixed one: with fixed windows an attacker
    gets `limit` attempts at 11:59:59 and `limit` more at 12:00:00, which is
    twice the rate the number promises.
    """

    limit: int
    window_seconds: float
    _hits: dict[str, deque[float]] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock)

    def check(self, key: str, *, now: float | None = None) -> None:
        """Record an attempt, or raise if the key is over its limit."""
        moment = time.monotonic() if now is None else now

        with self._lock:
            window = self._hits.setdefault(key, deque())

            cutoff = moment - self.window_seconds
            while window and window[0] <= cutoff:
                window.popleft()

            if len(window) >= self.limit:
                retry_after = max(1, int(window[0] + self.window_seconds - moment) + 1)
                raise RateLimitedError(retry_after)

            window.append(moment)

            # Without this the dict grows one entry per address seen, for ever.
            if not window:
                self._hits.pop(key, None)

    def reset(self, key: str) -> None:
        """Forget a key's history.

        Called after a successful login: someone who mistyped their password
        four times and then got it right should not be one attempt away from a
        lockout for the next fifteen minutes.
        """
        with self._lock:
            self._hits.pop(key, None)

    def prune(self, *, now: float | None = None) -> None:
        """Drop keys with no recent activity, so memory tracks live traffic."""
        moment = time.monotonic() if now is None else now
        cutoff = moment - self.window_seconds

        with self._lock:
            for key in [k for k, w in self._hits.items() if not w or w[-1] <= cutoff]:
                self._hits.pop(key, None)
