"""Readiness against a real database.

The interesting case cannot be tested with a fake: what readiness is for is
noticing that the database stopped answering, and only a real one can stop.
"""

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)


def app_with(database_url: str) -> TestClient:
    return TestClient(
        create_app(
            Settings(
                environment="local",
                database_url=database_url,
                jwt_secret="test-secret-long-enough-for-hmac-sha256",
            )
        )
    )


def test_a_reachable_database_makes_it_ready() -> None:
    with app_with(TEST_DATABASE_URL or "") as client:
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json()["database"] == "ok"


def test_an_unreachable_database_reports_it_without_crashing() -> None:
    """A 503, not a 500.

    The orchestrator reads the status code. A stack trace here would be an
    unhandled error, which some load balancers treat as a reason to restart the
    process — exactly the wrong response to a database that is briefly away.
    """
    with app_with("postgresql+asyncpg://nadie:nada@127.0.0.1:59999/ilia") as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["database"] == "unreachable"


def test_the_failure_reason_never_reaches_the_response() -> None:
    # This endpoint needs no credentials, and a driver error can carry the
    # connection string — password included.
    with app_with("postgresql+asyncpg://ilia:secreto@127.0.0.1:59999/ilia") as client:
        body = client.get("/health/ready").text

    assert "secreto" not in body

    # And liveness still answers, because the process itself is fine.
    with app_with("postgresql+asyncpg://ilia:secreto@127.0.0.1:59999/ilia") as client:
        assert client.get("/health").status_code == 200
