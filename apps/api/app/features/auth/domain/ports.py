"""Ports: what the auth domain needs from the outside world.

Every one of these is implemented in `infrastructure`. The application layer
depends only on what is declared here, which is what lets a use case be tested
without a database, without argon2's deliberate slowness, and without a clock
that moves on its own.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.features.auth.domain.entities import Email, User


class UserRepository(Protocol):
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    async def get_by_email(self, email: Email) -> User | None: ...

    async def add(self, user: User) -> None: ...


class PasswordHasher(Protocol):
    def hash(self, plain_password: str) -> str: ...

    def verify(self, plain_password: str, password_hash: str) -> bool: ...


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    access_expires_in: int
    refresh_expires_in: int


@dataclass(frozen=True)
class TokenClaims:
    subject: UUID
    role: str
    expires_at: datetime


class TokenService(Protocol):
    def issue_pair(self, user: User) -> TokenPair: ...

    def decode_access(self, token: str) -> TokenClaims: ...

    def decode_refresh(self, token: str) -> TokenClaims: ...


class Clock(Protocol):
    """Injected rather than read from `datetime.now()` so that token expiry can
    be tested without sleeping."""

    def now(self) -> datetime: ...
