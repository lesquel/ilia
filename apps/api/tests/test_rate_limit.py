"""Rate limiting on the endpoints that hand out credentials.

`argon2` makes each attempt expensive; this is what stops there being millions
of them.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.rate_limit import RateLimitedError, SlidingWindowLimiter
from app.main import create_app

NATIVE = {"X-Client-Platform": "native"}
ACCOUNT = {
    "email": "docente@colegio.edu",
    "full_name": "Ana Pérez",
    "password": "Una-clave-larga1!",
}


class TestSlidingWindow:
    def test_allows_up_to_the_limit_then_refuses(self) -> None:
        limiter = SlidingWindowLimiter(limit=3, window_seconds=60)

        for _ in range(3):
            limiter.check("a", now=100.0)

        with pytest.raises(RateLimitedError):
            limiter.check("a", now=100.0)

    def test_keys_do_not_share_a_budget(self) -> None:
        limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
        limiter.check("a", now=100.0)
        limiter.check("b", now=100.0)  # must not raise

    def test_the_window_slides_rather_than_resetting_on_the_hour(self) -> None:
        # With a fixed window an attacker gets `limit` attempts just before the
        # boundary and `limit` more just after — twice the advertised rate.
        limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
        limiter.check("a", now=0.0)
        limiter.check("a", now=59.0)

        with pytest.raises(RateLimitedError):
            limiter.check("a", now=59.5)

        # Only the first attempt has aged out here, so exactly one is allowed.
        limiter.check("a", now=61.0)
        with pytest.raises(RateLimitedError):
            limiter.check("a", now=61.0)

    def test_it_says_when_to_come_back(self) -> None:
        limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
        limiter.check("a", now=0.0)

        with pytest.raises(RateLimitedError) as raised:
            limiter.check("a", now=10.0)

        assert 1 <= raised.value.retry_after_seconds <= 61

    def test_a_success_clears_the_history(self) -> None:
        limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
        limiter.check("a", now=0.0)
        limiter.check("a", now=1.0)
        limiter.reset("a")

        limiter.check("a", now=2.0)  # must not raise

    def test_idle_keys_are_forgotten(self) -> None:
        # Otherwise the dict grows one entry per address seen, for ever.
        limiter = SlidingWindowLimiter(limit=5, window_seconds=60)
        limiter.check("a", now=0.0)
        limiter.prune(now=1000.0)

        assert limiter._hits == {}


@pytest.fixture
def limited_client() -> TestClient:
    """An app with a small limit, so the test does not need fifty requests."""
    settings = Settings(
        auth_rate_limit_attempts=3,
        auth_rate_limit_window_seconds=300,
        jwt_secret="rate-limit-test-secret-at-least-32-bytes",
    )
    return TestClient(create_app(settings))


class TestLoginThrottling:
    def test_repeated_failures_are_eventually_refused(self, limited_client: TestClient) -> None:
        limited_client.post("/api/v1/auth/register", json=ACCOUNT, headers=NATIVE)
        attempt = {"email": ACCOUNT["email"], "password": "no-es-la-mia"}

        seen = [
            limited_client.post("/api/v1/auth/login", json=attempt, headers=NATIVE).status_code
            for _ in range(4)
        ]

        assert seen[:2] == [401, 401]
        assert seen[-1] == 429

    def test_the_refusal_says_when_to_retry(self, limited_client: TestClient) -> None:
        attempt = {"email": "nadie@colegio.edu", "password": "x"}
        for _ in range(4):
            response = limited_client.post("/api/v1/auth/login", json=attempt, headers=NATIVE)

        assert response.status_code == 429
        assert response.json()["error"]["code"] == "too_many_attempts"
        # A 429 without this leaves the client guessing, and a guessing client
        # retries too soon and stays locked out.
        assert int(response.headers["retry-after"]) >= 1

    def test_getting_it_right_clears_the_budget(self, limited_client: TestClient) -> None:
        # Someone who mistyped twice and then remembered must not spend the next
        # five minutes one attempt from a lockout.
        limited_client.post("/api/v1/auth/register", json=ACCOUNT, headers=NATIVE)

        for _ in range(2):
            limited_client.post(
                "/api/v1/auth/login",
                json={"email": ACCOUNT["email"], "password": "mal"},
                headers=NATIVE,
            )

        good = {"email": ACCOUNT["email"], "password": ACCOUNT["password"]}
        assert (
            limited_client.post("/api/v1/auth/login", json=good, headers=NATIVE).status_code == 200
        )

        for _ in range(2):
            assert (
                limited_client.post(
                    "/api/v1/auth/login",
                    json={"email": ACCOUNT["email"], "password": "mal"},
                    headers=NATIVE,
                ).status_code
                == 401
            )

    def test_one_person_cannot_lock_another_out_of_their_own_account(
        self, limited_client: TestClient
    ) -> None:
        """The reason the budget is per client address and not per email.

        Counting per email would let anyone lock a teacher out by failing to log
        in as them — turning the defence into a denial-of-service tool pointed
        at exactly the person it exists to protect.
        """
        limited_client.post("/api/v1/auth/register", json=ACCOUNT, headers=NATIVE)

        attacker = {"X-Forwarded-For": "203.0.113.9", **NATIVE}
        for _ in range(4):
            limited_client.post(
                "/api/v1/auth/login",
                json={"email": ACCOUNT["email"], "password": "adivinando"},
                headers=attacker,
            )

        victim = {"X-Forwarded-For": "198.51.100.4", **NATIVE}
        response = limited_client.post(
            "/api/v1/auth/login",
            json={"email": ACCOUNT["email"], "password": ACCOUNT["password"]},
            headers=victim,
        )

        assert response.status_code == 200

    def test_registration_is_throttled_too(self, limited_client: TestClient) -> None:
        # Otherwise the endpoint is a way to discover which addresses already
        # have accounts, one 409 at a time.
        seen = [
            limited_client.post(
                "/api/v1/auth/register",
                json={**ACCOUNT, "email": f"otra{n}@colegio.edu"},
                headers=NATIVE,
            ).status_code
            for n in range(4)
        ]

        assert seen[-1] == 429

    def test_each_action_has_its_own_budget(self, limited_client: TestClient) -> None:
        # Failing to log in must not stop someone else on the same network from
        # registering.
        for _ in range(4):
            limited_client.post(
                "/api/v1/auth/login",
                json={"email": "nadie@colegio.edu", "password": "x"},
                headers=NATIVE,
            )

        assert (
            limited_client.post("/api/v1/auth/register", json=ACCOUNT, headers=NATIVE).status_code
            == 201
        )
