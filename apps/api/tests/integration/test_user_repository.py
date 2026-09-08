"""Repository tests against a real PostgreSQL (TRD 13).

Skipped when `ILIA_TEST_DATABASE_URL` is unset, so `uv run pytest` still works
without Docker. CI always sets it — a repository suite that quietly skips is a
repository suite that proves nothing.
"""

import os
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.domain.errors import EmailAlreadyRegisteredError
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)


@pytest.fixture
async def database():  # type: ignore[no-untyped-def]
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))

    async with db.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    yield db

    # Truncate rather than drop: keeps the schema Alembic built and still leaves
    # each test with an empty table.
    async with db.engine.begin() as connection:
        await connection.execute(text("TRUNCATE app_user, cohort CASCADE"))
    await db.dispose()


@pytest.fixture
def repository(database: Database) -> SqlAlchemyUserRepository:
    return SqlAlchemyUserRepository(database)


def make_user(email: str = "docente@colegio.edu") -> User:
    return User.register(
        email=Email(email),
        full_name="Ana Pérez",
        password_hash="argon2::fake",
    )


class TestSqlAlchemyUserRepository:
    async def test_stores_and_reads_back_by_id(self, repository: SqlAlchemyUserRepository) -> None:
        user = make_user()

        await repository.add(user)
        found = await repository.get_by_id(user.id)

        assert found is not None
        assert found.id == user.id
        assert found.full_name == "Ana Pérez"
        assert found.role is Role.STUDENT

    async def test_reads_back_by_email(self, repository: SqlAlchemyUserRepository) -> None:
        user = make_user()
        await repository.add(user)

        found = await repository.get_by_email(Email("docente@colegio.edu"))

        assert found is not None
        assert found.id == user.id

    async def test_lookup_by_email_is_case_insensitive_through_normalization(
        self, repository: SqlAlchemyUserRepository
    ) -> None:
        await repository.add(make_user("Docente@Colegio.EDU"))

        assert await repository.get_by_email(Email("docente@colegio.edu")) is not None

    async def test_returns_none_for_an_unknown_id(
        self, repository: SqlAlchemyUserRepository
    ) -> None:
        assert await repository.get_by_id(uuid4()) is None

    async def test_returns_none_for_an_unknown_email(
        self, repository: SqlAlchemyUserRepository
    ) -> None:
        assert await repository.get_by_email(Email("nadie@colegio.edu")) is None

    async def test_the_unique_index_is_what_really_prevents_duplicates(
        self, repository: SqlAlchemyUserRepository
    ) -> None:
        # The use case checks first, but two concurrent registrations both pass
        # that check. This is the guarantee that actually holds.
        await repository.add(make_user())

        with pytest.raises(EmailAlreadyRegisteredError):
            await repository.add(make_user())

    async def test_a_stored_role_survives_the_round_trip(
        self, repository: SqlAlchemyUserRepository
    ) -> None:
        user = make_user()
        user.role = Role.INSTRUCTOR
        await repository.add(user)

        found = await repository.get_by_id(user.id)

        assert found is not None
        assert found.role is Role.INSTRUCTOR
