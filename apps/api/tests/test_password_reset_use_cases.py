from datetime import timedelta

import pytest

from app.features.admin.domain.errors import UserNotFoundError
from app.features.auth.application.use_cases import (
    AuthenticateUser,
    CompletePasswordReset,
    IssuePasswordReset,
    RegisterUser,
    RequestPasswordReset,
)
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.domain.errors import InvalidTokenError, SamePasswordError
from app.features.auth.infrastructure.memory_repository import InMemoryUserRepository
from app.features.auth.infrastructure.memory_reset_repository import (
    InMemoryPasswordResetTokenRepository,
)
from tests.fakes import FakeHasher, FakeResetAuditLog, FakeTokenService, FrozenClock


@pytest.fixture
def users() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def resets() -> InMemoryPasswordResetTokenRepository:
    return InMemoryPasswordResetTokenRepository()


@pytest.fixture
def hasher() -> FakeHasher:
    return FakeHasher()


@pytest.fixture
def tokens() -> FakeTokenService:
    return FakeTokenService()


@pytest.fixture
def audit() -> FakeResetAuditLog:
    return FakeResetAuditLog()


@pytest.fixture
def clock() -> FrozenClock:
    return FrozenClock()


@pytest.fixture
def ttl() -> timedelta:
    return timedelta(hours=24)


@pytest.fixture
async def student(
    users: InMemoryUserRepository, hasher: FakeHasher, tokens: FakeTokenService, clock: FrozenClock
) -> User:
    session = await RegisterUser(users=users, hasher=hasher, tokens=tokens, clock=clock).execute(
        email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
    )
    return session.user


@pytest.fixture
async def instructor(users: InMemoryUserRepository, hasher: FakeHasher) -> User:
    user = User.register(
        email=Email("instructor@ilia.edu"),
        full_name="Instructor",
        password_hash=hasher.hash("instr-clave"),
        role=Role.INSTRUCTOR,
    )
    await users.add(user)
    return user


class TestRequestPasswordReset:
    async def test_unknown_email_is_silent(
        self,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        clock: FrozenClock,
        ttl: timedelta,
    ) -> None:
        await RequestPasswordReset(
            users=users, resets=resets, hasher=hasher, clock=clock, token_ttl=ttl
        ).execute(email="nadie@colegio.edu")

        assert len(resets._tokens) == 0
        assert hasher.hash_calls == 1

    async def test_active_user_gets_a_token(
        self,
        student: User,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        clock: FrozenClock,
        ttl: timedelta,
    ) -> None:
        await RequestPasswordReset(
            users=users, resets=resets, hasher=hasher, clock=clock, token_ttl=ttl
        ).execute(email="docente@colegio.edu")

        assert len(resets._tokens) == 1
        assert resets._tokens[0].user_id == student.id


class TestIssuePasswordReset:
    async def test_returns_raw_token_and_audits(
        self,
        instructor: User,
        student: User,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        clock: FrozenClock,
        audit: FakeResetAuditLog,
        ttl: timedelta,
    ) -> None:
        issued = await IssuePasswordReset(
            users=users,
            resets=resets,
            hasher=hasher,
            clock=clock,
            audit=audit,
            token_ttl=ttl,
        ).execute(actor=instructor, email="docente@colegio.edu")

        assert issued.reset_token.startswith(f"{student.id}.")
        assert audit.issued == [(instructor.id, student.id)]

    async def test_unknown_user_raises(
        self,
        instructor: User,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        clock: FrozenClock,
        audit: FakeResetAuditLog,
        ttl: timedelta,
    ) -> None:
        with pytest.raises(UserNotFoundError):
            await IssuePasswordReset(
                users=users,
                resets=resets,
                hasher=hasher,
                clock=clock,
                audit=audit,
                token_ttl=ttl,
            ).execute(actor=instructor, email="nadie@colegio.edu")


class TestCompletePasswordReset:
    async def test_resets_password_and_logs_in(
        self,
        student: User,
        instructor: User,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        tokens: FakeTokenService,
        clock: FrozenClock,
        audit: FakeResetAuditLog,
        ttl: timedelta,
    ) -> None:
        issued = await IssuePasswordReset(
            users=users,
            resets=resets,
            hasher=hasher,
            clock=clock,
            audit=audit,
            token_ttl=ttl,
        ).execute(actor=instructor, email="docente@colegio.edu")

        session = await CompletePasswordReset(
            users=users,
            resets=resets,
            hasher=hasher,
            tokens=tokens,
            clock=clock,
            audit=audit,
        ).execute(reset_token=issued.reset_token, new_password="clave-nueva-larga")

        assert audit.completed == [student.id]
        assert session.user.token_generation == 1

        auth = AuthenticateUser(users=users, hasher=hasher, tokens=tokens)
        await auth.execute(email="docente@colegio.edu", password="clave-nueva-larga")

    async def test_rejects_bad_token(
        self,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        tokens: FakeTokenService,
        clock: FrozenClock,
        audit: FakeResetAuditLog,
    ) -> None:
        with pytest.raises(InvalidTokenError):
            await CompletePasswordReset(
                users=users,
                resets=resets,
                hasher=hasher,
                tokens=tokens,
                clock=clock,
                audit=audit,
            ).execute(reset_token="00000000-0000-0000-0000-000000000099.fake", new_password="x" * 8)

    async def test_rejects_reusing_the_same_password(
        self,
        student: User,
        instructor: User,
        users: InMemoryUserRepository,
        resets: InMemoryPasswordResetTokenRepository,
        hasher: FakeHasher,
        tokens: FakeTokenService,
        clock: FrozenClock,
        audit: FakeResetAuditLog,
        ttl: timedelta,
    ) -> None:
        issued = await IssuePasswordReset(
            users=users,
            resets=resets,
            hasher=hasher,
            clock=clock,
            audit=audit,
            token_ttl=ttl,
        ).execute(actor=instructor, email="docente@colegio.edu")

        with pytest.raises(SamePasswordError):
            await CompletePasswordReset(
                users=users,
                resets=resets,
                hasher=hasher,
                tokens=tokens,
                clock=clock,
                audit=audit,
            ).execute(reset_token=issued.reset_token, new_password="una-clave-larga")
