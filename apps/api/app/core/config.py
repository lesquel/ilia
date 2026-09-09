"""Application settings, resolved once at startup from the environment."""

from functools import lru_cache
from typing import Literal

from fastapi import Request
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="ILIA_",
        extra="ignore",
    )

    environment: Environment = "local"
    debug: bool = False

    project_name: str = "ILIA API"
    api_prefix: str = "/api/v1"

    # Comma-separated list of allowed browser origins. The web client is a
    # first-class target (TRD 4.5), so CORS is not an afterthought here.
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:8081"])

    # --- Database -----------------------------------------------------------

    # Async driver required, e.g.
    # postgresql+asyncpg://ilia:ilia@localhost:5432/ilia
    # When unset, the app falls back to in-memory repositories: usable for a
    # quick look at the API, useless for anything real (it forgets on restart).
    database_url: str | None = None

    # --- LLM cost -----------------------------------------------------------

    # Price per million tokens, for the admin cost report (PRD A-03).
    # Zero until a provider is chosen (TRD 2.6): a hard-coded price would make
    # an invented cost report look authoritative.
    llm_input_price_per_million: float = 0.0
    llm_output_price_per_million: float = 0.0

    # --- Auth ---------------------------------------------------------------

    # Override in every deployed environment. The default exists so `uv run` and
    # the test suite work out of the box; `_reject_default_secret_in_production`
    # is what stops it from ever reaching production.
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    # Cookie session, for the web client only (TRD 4.5).
    session_cookie_name: str = "ilia_session"
    refresh_cookie_name: str = "ilia_refresh"
    # None means "host-only": the cookie is sent back only to the exact host that
    # set it. Set it to the registrable domain (e.g. `.ilia.app`) when the web
    # client and the API live on different subdomains.
    cookie_domain: str | None = None
    cookie_secure: bool = True
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def _reject_default_secret_in_production(self) -> "Settings":
        if not self.is_production:
            return self

        if self.jwt_secret == "dev-secret-change-me":
            raise ValueError(
                "ILIA_JWT_SECRET must be set in production: the default signing key "
                "is public, and anything signed with it can be forged."
            )

        # RFC 7518 3.2: an HMAC key shorter than the hash output weakens the
        # signature. A forgeable access token is a forged identity.
        if len(self.jwt_secret.encode()) < 32:
            raise ValueError("ILIA_JWT_SECRET must be at least 32 bytes long")

        return self

    @model_validator(mode="after")
    def _require_secure_cookies_in_production(self) -> "Settings":
        if self.is_production and not self.cookie_secure:
            raise ValueError("ILIA_COOKIE_SECURE cannot be disabled in production")
        return self

    @model_validator(mode="after")
    def _require_a_database_in_production(self) -> "Settings":
        if self.is_production and not self.database_url:
            raise ValueError(
                "ILIA_DATABASE_URL is required in production: without it the app "
                "runs on in-memory repositories and loses every account on restart."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Cached accessor, for startup only.

    Do **not** depend on this from a route. It reads the process environment and
    would silently ignore whatever settings the running app was actually built
    with — which is how an app ends up honouring one configuration at startup
    and a different one per request. Routes use `get_app_settings`.
    """
    return Settings()


def get_app_settings(request: Request) -> Settings:
    """Request-time accessor: the exact settings this app was created with."""
    return request.app.state.settings  # type: ignore[no-any-return]
