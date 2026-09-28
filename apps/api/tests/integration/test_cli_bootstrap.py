"""Integration tests for explicit first-admin provisioning."""

import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.cli import main as _main
from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.infrastructure.security import Argon2PasswordHasher

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")


async def main(argv: list[str]) -> int:
    return await asyncio.to_thread(_main, argv)


pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)


@pytest.fixture(autouse=True)
def environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ILIA_DATABASE_URL", TEST_DATABASE_URL or "")
    monkeypatch.setenv("ILIA_JWT_SECRET", "test-secret-long-enough-for-hmac-sha256")
    monkeypatch.setenv("ILIA_BOOTSTRAP_ADMIN_EMAIL", "jefa@ministerio.gob")
    monkeypatch.setenv("ILIA_BOOTSTRAP_ADMIN_NAME", "Jefa de Ministerio")
    monkeypatch.setenv("ILIA_BOOTSTRAP_ADMIN_PASSWORD", "correct horse battery staple")
    from app.core.config import get_settings

    get_settings.cache_clear()


async def _reset() -> None:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(text("TRUNCATE audit_log, app_user CASCADE"))
    finally:
        await db.dispose()


async def _add_user(email: str, role: str = "student") -> None:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            await connection.execute(
                text("""
                    INSERT INTO app_user (id, email, full_name, password_hash, role, is_active)
                    VALUES (:id, :email, 'Persona', 'argon2::fake', :role, true)
                """),
                {"id": uuid4(), "email": email, "role": role},
            )
    finally:
        await db.dispose()


async def _user(email: str) -> dict[str, str] | None:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            row = (await connection.execute(
                text("SELECT role, full_name, password_hash FROM app_user WHERE email = :email"),
                {"email": email},
            )).one_or_none()
            return dict(row._mapping) if row else None
    finally:
        await db.dispose()


async def _audit_reasons() -> list[str]:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            rows = await connection.execute(text("SELECT detail->>'reason' FROM audit_log"))
            return [row[0] for row in rows.all()]
    finally:
        await db.dispose()


@pytest.mark.asyncio
async def test_it_creates_the_first_administrator_from_environment() -> None:
    await _reset()

    assert await main(["create-admin"]) == 0
    created = await _user("jefa@ministerio.gob")
    assert created is not None
    assert created["role"] == "admin"
    assert created["full_name"] == "Jefa de Ministerio"
    assert Argon2PasswordHasher().verify("correct horse battery staple", created["password_hash"])


@pytest.mark.asyncio
async def test_the_grant_is_audited_and_marked_as_a_bootstrap() -> None:
    await _reset()

    await main(["create-admin"])

    assert await _audit_reasons() == ["bootstrap: first administrator"]


@pytest.mark.asyncio
async def test_it_refuses_once_another_administrator_exists() -> None:
    await _reset()
    await _add_user("otro@ministerio.gob", role="admin")

    assert await main(["create-admin"]) == 1
    assert not (await _user("jefa@ministerio.gob"))


@pytest.mark.asyncio
async def test_running_it_twice_for_the_same_administrator_is_harmless() -> None:
    await _reset()

    assert await main(["create-admin"]) == 0
    original_hash = (await _user("jefa@ministerio.gob"))["password_hash"]
    assert await main(["create-admin"]) == 0
    assert (await _user("jefa@ministerio.gob"))["password_hash"] == original_hash
    assert len(await _audit_reasons()) == 1


@pytest.mark.asyncio
async def test_it_refuses_an_existing_non_admin_account() -> None:
    await _reset()
    await _add_user("jefa@ministerio.gob")

    assert await main(["create-admin"]) == 1


@pytest.mark.asyncio
async def test_it_validates_required_environment_values(monkeypatch: pytest.MonkeyPatch) -> None:
    await _reset()
    monkeypatch.delenv("ILIA_BOOTSTRAP_ADMIN_PASSWORD")
    from app.core.config import get_settings

    get_settings.cache_clear()
    assert await main(["create-admin"]) == 2


@pytest.mark.asyncio
async def test_it_refuses_production(monkeypatch: pytest.MonkeyPatch) -> None:
    await _reset()
    monkeypatch.setenv("ILIA_ENVIRONMENT", "production")
    monkeypatch.setenv("ILIA_JWT_SECRET", "x" * 32)
    from app.core.config import get_settings

    get_settings.cache_clear()
    assert await main(["create-admin"]) == 1
