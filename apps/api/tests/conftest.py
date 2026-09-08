import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hide every `ILIA_*` variable from the tests.

    `Settings` reads the environment, so without this a variable exported by the
    developer's shell or by CI silently changes what the suite is testing. That
    is not hypothetical: setting `ILIA_DATABASE_URL` in CI made the unit tests
    open real database connections from TestClient's event loop and fail with
    "attached to a different loop".

    Integration tests are unaffected: they read `ILIA_TEST_DATABASE_URL` at
    import time, before any fixture runs, and pass it to `Settings` explicitly.
    """
    for name in list(os.environ):
        if name.startswith("ILIA_"):
            monkeypatch.delenv(name, raising=False)

    # A developer following the README will have a real `.env` sitting here.
    # It must not reach the suite either, for the same reason.
    monkeypatch.setitem(Settings.model_config, "env_file", None)


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
        database_url=None,
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
