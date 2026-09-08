"""The production guards in Settings.

These are the difference between a misconfiguration that fails at boot and one
that ships a forgeable signing key.
"""

import pytest
from pydantic import ValidationError

from app.core.config import Settings

STRONG_SECRET = "a-secret-that-is-at-least-32-bytes-long"
DATABASE_URL = "postgresql+asyncpg://ilia:ilia@db:5432/ilia"


def test_the_default_secret_is_refused_in_production() -> None:
    with pytest.raises(ValidationError, match="ILIA_JWT_SECRET"):
        Settings(environment="production")


def test_a_short_secret_is_refused_in_production() -> None:
    with pytest.raises(ValidationError, match="32 bytes"):
        Settings(environment="production", jwt_secret="too-short")


def test_insecure_cookies_are_refused_in_production() -> None:
    with pytest.raises(ValidationError, match="COOKIE_SECURE"):
        Settings(
            environment="production",
            jwt_secret=STRONG_SECRET,
            database_url=DATABASE_URL,
            cookie_secure=False,
        )


def test_a_missing_database_is_refused_in_production() -> None:
    # In-memory repositories in production means every teacher's account
    # disappears on the next deploy.
    with pytest.raises(ValidationError, match="ILIA_DATABASE_URL"):
        Settings(environment="production", jwt_secret=STRONG_SECRET)


def test_a_correct_production_configuration_is_accepted() -> None:
    settings = Settings(
        environment="production",
        jwt_secret=STRONG_SECRET,
        database_url=DATABASE_URL,
    )

    assert settings.is_production
    assert settings.cookie_secure


def test_local_development_works_without_any_configuration() -> None:
    # The guards must not make the project impossible to run out of the box.
    assert Settings(environment="local").jwt_secret == "dev-secret-change-me"
