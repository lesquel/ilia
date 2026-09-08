"""Application settings, resolved once at startup from the environment."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
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

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached accessor. Dependency injection resolves this at startup, never
    inside a use case — use cases receive ports, not configuration."""
    return Settings()
