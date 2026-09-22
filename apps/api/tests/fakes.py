"""Test doubles for the auth ports.

Fakes rather than mocks: they behave, so a test asserts on outcomes instead of
on which methods were called.
"""

from datetime import UTC, datetime, timedelta

from app.features.auth.domain.entities import User
from app.features.auth.domain.errors import InvalidTokenError
from app.features.auth.domain.ports import TokenClaims, TokenPair


class FakeHasher:
    """Reversible on purpose. Argon2 is deliberately slow, and paying that cost
    in every unit test buys nothing."""

    def __init__(self) -> None:
        self.hash_calls = 0

    def hash(self, plain_password: str) -> str:
        self.hash_calls += 1
        return f"hashed::{plain_password}"

    def verify(self, plain_password: str, password_hash: str) -> bool:
        return password_hash == f"hashed::{plain_password}"


class FakeTokenService:
    def __init__(self) -> None:
        self._issued: dict[str, User] = {}

    def issue_pair(self, user: User) -> TokenPair:
        access = f"access::{user.id}"
        refresh = f"refresh::{user.id}"
        self._issued[access] = user
        self._issued[refresh] = user
        return TokenPair(
            access_token=access,
            refresh_token=refresh,
            access_expires_in=900,
            refresh_expires_in=2_592_000,
        )

    def decode_access(self, token: str) -> TokenClaims:
        return self._decode(token, "access")

    def decode_refresh(self, token: str) -> TokenClaims:
        return self._decode(token, "refresh")

    def _decode(self, token: str, expected_prefix: str) -> TokenClaims:
        user = self._issued.get(token)
        if user is None or not token.startswith(f"{expected_prefix}::"):
            raise InvalidTokenError()
        return TokenClaims(
            subject=user.id,
            role=user.role.value,
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
            generation=user.token_generation,
        )


class FakeResetAuditLog:
    def __init__(self) -> None:
        self.issued: list[tuple] = []
        self.completed: list = []

    async def record_issued(self, *, actor, target) -> None:  # type: ignore[no-untyped-def]
        self.issued.append((actor.id, target.id))

    async def record_completed(self, *, user) -> None:  # type: ignore[no-untyped-def]
        self.completed.append(user.id)


class FrozenClock:
    def __init__(self, at: datetime | None = None) -> None:
        self._at = at or datetime(2026, 9, 8, 12, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self._at
