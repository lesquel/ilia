import pytest

from app.features.auth.application.use_cases import (
    AuthenticateUser,
    RefreshSession,
    RegisterUser,
)
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.domain.errors import (
    EmailAlreadyRegisteredError,
    InactiveAccountError,
    InvalidCredentialsError,
    InvalidTokenError,
)
from app.features.auth.infrastructure.memory_repository import InMemoryUserRepository
from tests.fakes import FakeHasher, FakeTokenService, FrozenClock


@pytest.fixture
def users() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def hasher() -> FakeHasher:
    return FakeHasher()


@pytest.fixture
def tokens() -> FakeTokenService:
    return FakeTokenService()


@pytest.fixture
def register(
    users: InMemoryUserRepository, hasher: FakeHasher, tokens: FakeTokenService
) -> RegisterUser:
    return RegisterUser(users=users, hasher=hasher, tokens=tokens, clock=FrozenClock())


@pytest.fixture
def authenticate(
    users: InMemoryUserRepository, hasher: FakeHasher, tokens: FakeTokenService
) -> AuthenticateUser:
    return AuthenticateUser(users=users, hasher=hasher, tokens=tokens)


class TestRegisterUser:
    async def test_stores_the_user_and_returns_a_session(
        self, register: RegisterUser, users: InMemoryUserRepository
    ) -> None:
        session = await register.execute(
            email="Docente@Colegio.EDU",
            full_name="Ana Pérez",
            password="una-clave-larga",
        )

        assert session.user.role is Role.STUDENT
        assert session.tokens.access_token
        assert await users.get_by_email(Email("docente@colegio.edu")) is not None

    async def test_never_stores_the_plain_password(self, register: RegisterUser) -> None:
        session = await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )

        assert session.user.password_hash != "una-clave-larga"

    async def test_rejects_an_address_already_taken_in_another_casing(
        self, register: RegisterUser
    ) -> None:
        await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )

        with pytest.raises(EmailAlreadyRegisteredError):
            await register.execute(
                email="DOCENTE@colegio.edu", full_name="Otra", password="otra-clave-larga"
            )


class TestAuthenticateUser:
    async def test_accepts_the_right_password(
        self, register: RegisterUser, authenticate: AuthenticateUser
    ) -> None:
        await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )

        session = await authenticate.execute(
            email="docente@colegio.edu", password="una-clave-larga"
        )

        assert str(session.user.email) == "docente@colegio.edu"

    async def test_rejects_the_wrong_password(
        self, register: RegisterUser, authenticate: AuthenticateUser
    ) -> None:
        await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )

        with pytest.raises(InvalidCredentialsError):
            await authenticate.execute(email="docente@colegio.edu", password="incorrecta")

    async def test_an_unknown_account_fails_exactly_like_a_wrong_password(
        self, authenticate: AuthenticateUser
    ) -> None:
        with pytest.raises(InvalidCredentialsError) as unknown:
            await authenticate.execute(email="nadie@colegio.edu", password="una-clave-larga")

        assert unknown.value.code == "invalid_credentials"

    async def test_a_malformed_address_is_reported_as_bad_credentials_not_bad_input(
        self, authenticate: AuthenticateUser
    ) -> None:
        # Otherwise the error itself tells an attacker the address was never
        # looked up, which is half of an enumeration oracle.
        with pytest.raises(InvalidCredentialsError):
            await authenticate.execute(email="no-arroba", password="una-clave-larga")

    async def test_hashes_even_when_the_account_does_not_exist(
        self, authenticate: AuthenticateUser, hasher: FakeHasher
    ) -> None:
        # Equal work on a miss and on a hit: without this, response time alone
        # reveals which teachers have accounts.
        with pytest.raises(InvalidCredentialsError):
            await authenticate.execute(email="nadie@colegio.edu", password="una-clave-larga")

        assert hasher.hash_calls == 1

    async def test_rejects_a_disabled_account(
        self, users: InMemoryUserRepository, authenticate: AuthenticateUser, hasher: FakeHasher
    ) -> None:
        user = User.register(
            email=Email("baja@colegio.edu"),
            full_name="Baja",
            password_hash=hasher.hash("una-clave-larga"),
        )
        user.is_active = False
        await users.add(user)

        with pytest.raises(InactiveAccountError):
            await authenticate.execute(email="baja@colegio.edu", password="una-clave-larga")


class TestRefreshSession:
    async def test_issues_a_new_pair(
        self,
        register: RegisterUser,
        users: InMemoryUserRepository,
        tokens: FakeTokenService,
    ) -> None:
        session = await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )

        refreshed = await RefreshSession(users=users, tokens=tokens).execute(
            refresh_token=session.tokens.refresh_token
        )

        assert refreshed.user.id == session.user.id

    async def test_rejects_an_access_token_used_as_a_refresh_token(
        self,
        register: RegisterUser,
        users: InMemoryUserRepository,
        tokens: FakeTokenService,
    ) -> None:
        session = await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )

        with pytest.raises(InvalidTokenError):
            await RefreshSession(users=users, tokens=tokens).execute(
                refresh_token=session.tokens.access_token
            )

    async def test_a_disabled_account_cannot_refresh(
        self,
        register: RegisterUser,
        users: InMemoryUserRepository,
        tokens: FakeTokenService,
    ) -> None:
        # The point of re-reading the user on refresh: disabling an account must
        # take effect within one access-token lifetime.
        session = await register.execute(
            email="docente@colegio.edu", full_name="Ana", password="una-clave-larga"
        )
        session.user.is_active = False

        with pytest.raises(InactiveAccountError):
            await RefreshSession(users=users, tokens=tokens).execute(
                refresh_token=session.tokens.refresh_token
            )
