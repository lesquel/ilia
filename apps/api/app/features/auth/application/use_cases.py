"""Auth use cases.

Each one depends only on ports declared in `domain`. Nothing here knows about
HTTP, cookies, argon2 or PostgreSQL — that is what makes them testable in
milliseconds with fakes.
"""

from dataclasses import dataclass
from uuid import UUID

from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.domain.errors import (
    EmailAlreadyRegisteredError,
    InactiveAccountError,
    InvalidCredentialsError,
    InvalidTokenError,
    SamePasswordError,
)
from app.features.auth.domain.ports import (
    Clock,
    PasswordHasher,
    TokenPair,
    TokenService,
    UserRepository,
)


@dataclass(frozen=True)
class Session:
    user: User
    tokens: TokenPair


class RegisterUser:
    def __init__(
        self,
        *,
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        clock: Clock,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._tokens = tokens
        self._clock = clock

    async def execute(self, *, email: str, full_name: str, password: str) -> Session:
        address = Email(email)

        if await self._users.get_by_email(address) is not None:
            raise EmailAlreadyRegisteredError()

        user = User.register(
            email=address,
            full_name=full_name,
            password_hash=self._hasher.hash(password),
            role=Role.STUDENT,
            created_at=self._clock.now(),
        )
        await self._users.add(user)

        return Session(user=user, tokens=self._tokens.issue_pair(user))


class AuthenticateUser:
    def __init__(
        self,
        *,
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._tokens = tokens

    async def execute(self, *, email: str, password: str) -> Session:
        try:
            address = Email(email)
        except ValueError as exc:
            # A malformed address is still just a failed login. Reporting it as a
            # validation error would leak that the address was never checked
            # against the database.
            raise InvalidCredentialsError() from exc

        user = await self._users.get_by_email(address)

        if user is None:
            # Hash the supplied password anyway. Skipping it would make a miss
            # measurably faster than a hit, and that timing difference alone
            # reveals which teachers have accounts.
            self._hasher.hash(password)
            raise InvalidCredentialsError()

        if not self._hasher.verify(password, user.password_hash):
            raise InvalidCredentialsError()

        if not user.is_active:
            raise InactiveAccountError()

        return Session(user=user, tokens=self._tokens.issue_pair(user))


class RefreshSession:
    def __init__(self, *, users: UserRepository, tokens: TokenService) -> None:
        self._users = users
        self._tokens = tokens

    async def execute(self, *, refresh_token: str) -> Session:
        claims = self._tokens.decode_refresh(refresh_token)

        user = await self._users.get_by_id(claims.subject)
        if user is None:
            raise InvalidTokenError()

        # Re-read the user on every refresh instead of trusting the token's
        # claims. A role change or a disabled account must take effect within
        # one access-token lifetime, not whenever the refresh token expires.
        if not user.is_active:
            raise InactiveAccountError()

        # Issued before a password change. Refusing it is what makes changing a
        # password actually evict whoever else was signed in; without this the
        # intruder keeps refreshing for another thirty days.
        if claims.generation < user.token_generation:
            raise InvalidTokenError()

        return Session(user=user, tokens=self._tokens.issue_pair(user))


class GetCurrentUser:
    def __init__(self, *, users: UserRepository) -> None:
        self._users = users

    async def execute(self, *, user_id: UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise InvalidTokenError()
        if not user.is_active:
            raise InactiveAccountError()
        return user


class ChangePassword:
    """Change your own password (with a session already open).

    Separate from any future reset-by-email flow, and useful without it: this
    is the one someone reaches for after typing their password on a shared
    staffroom computer.

    The current password is required. A session cookie alone is not enough —
    somebody who walked up to an unlocked laptop would otherwise take the
    account permanently, and the real owner would have no way back.
    """

    def __init__(self, *, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    async def execute(self, *, user_id: UUID, current_password: str, new_password: str) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise InvalidTokenError()

        if not self._hasher.verify(current_password, user.password_hash):
            raise InvalidCredentialsError()

        if current_password == new_password:
            raise SamePasswordError()

        user.change_password(self._hasher.hash(new_password))
        await self._users.update(user)

        return user
