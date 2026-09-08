"""Adapters for the security ports: password hashing, tokens and the clock."""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from argon2 import PasswordHasher as Argon2
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.features.auth.domain.entities import User
from app.features.auth.domain.errors import InvalidTokenError
from app.features.auth.domain.ports import TokenClaims, TokenPair

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


class Argon2PasswordHasher:
    """Argon2id, the current recommendation for password storage.

    Its cost parameters are what make it slow on purpose, which is also why
    tests inject a fake hasher instead of this one.
    """

    def __init__(self) -> None:
        self._hasher = Argon2()

    def hash(self, plain_password: str) -> str:
        return self._hasher.hash(plain_password)

    def verify(self, plain_password: str, password_hash: str) -> bool:
        try:
            return self._hasher.verify(password_hash, plain_password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class JwtTokenService:
    """Signed, stateless tokens.

    Access tokens are deliberately short-lived: because they are not checked
    against storage, revoking one early is impossible, and a short lifetime is
    the only thing that bounds the damage of a leaked token.
    """

    def __init__(
        self,
        *,
        secret: str,
        algorithm: str = "HS256",
        access_ttl: timedelta,
        refresh_ttl: timedelta,
        issuer: str = "ilia",
    ) -> None:
        self._secret = secret
        self._algorithm = algorithm
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl
        self._issuer = issuer

    def issue_pair(self, user: User) -> TokenPair:
        now = datetime.now(UTC)

        return TokenPair(
            access_token=self._encode(user, now, ACCESS_TOKEN_TYPE, self._access_ttl),
            refresh_token=self._encode(user, now, REFRESH_TOKEN_TYPE, self._refresh_ttl),
            access_expires_in=int(self._access_ttl.total_seconds()),
            refresh_expires_in=int(self._refresh_ttl.total_seconds()),
        )

    def decode_access(self, token: str) -> TokenClaims:
        return self._decode(token, ACCESS_TOKEN_TYPE)

    def decode_refresh(self, token: str) -> TokenClaims:
        return self._decode(token, REFRESH_TOKEN_TYPE)

    def _encode(self, user: User, now: datetime, token_type: str, ttl: timedelta) -> str:
        expires_at = now + ttl
        payload: dict[str, Any] = {
            "sub": str(user.id),
            "role": user.role.value,
            "type": token_type,
            "iss": self._issuer,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp()),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def _decode(self, token: str, expected_type: str) -> TokenClaims:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                issuer=self._issuer,
                options={"require": ["exp", "iat", "sub", "iss"]},
            )
        except jwt.PyJWTError as exc:
            raise InvalidTokenError() from exc

        # Without this check a refresh token would be accepted as an access
        # token, handing a long-lived credential the reach of a short-lived one.
        if payload.get("type") != expected_type:
            raise InvalidTokenError()

        try:
            subject = UUID(str(payload["sub"]))
        except (KeyError, ValueError) as exc:
            raise InvalidTokenError() from exc

        return TokenClaims(
            subject=subject,
            role=str(payload.get("role", "")),
            expires_at=datetime.fromtimestamp(float(payload["exp"]), tz=UTC),
        )
