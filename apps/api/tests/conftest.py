import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    # `cookie_secure` is off only here: TestClient talks plain http, and a
    # Secure cookie would never be stored, so the transport assertions would
    # pass for the wrong reason.
    return Settings(
        environment="local",
        debug=False,
        jwt_secret="test-secret-long-enough-for-hmac-sha256",
        cookie_secure=False,
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
