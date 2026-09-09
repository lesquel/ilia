"""Bootstrapping the first administrator.

This exists to break a deadlock: roles are granted and never claimed (PRD A-02),
so a fresh deployment has nobody who can grant them. No admin means no
instructors, which means no courses — the platform frozen the moment it ships.

Against a real database because the whole point is what it does to rows.
"""

import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.cli import main as _main
from app.core.config import Settings
from app.core.database import Base, Database

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")


async def main(argv: list[str]) -> int:
    """Run the real entry point off the test's event loop.

    `main` calls `asyncio.run`, which refuses to nest. A thread has no loop of
    its own, so this exercises the command exactly as an operator's shell does
    rather than reaching past it into the internals.
    """
    return await asyncio.to_thread(_main, argv)


pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)


@pytest.fixture(autouse=True)
def environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """The CLI reads settings from the environment, as an operator would."""
    monkeypatch.setenv("ILIA_DATABASE_URL", TEST_DATABASE_URL or "")
    monkeypatch.setenv("ILIA_JWT_SECRET", "test-secret-long-enough-for-hmac-sha256")
    # `get_settings` is cached for startup use; the CLI is a fresh process in
    # real life, so the cache has to be dropped here.
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


async def _roles() -> dict[str, str]:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            rows = await connection.execute(text("SELECT email, role FROM app_user"))
            return {email: role for email, role in rows.all()}
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
async def test_it_promotes_the_first_administrator() -> None:
    await _reset()
    await _add_user("jefa@ministerio.gob")

    assert await main(["bootstrap-admin", "jefa@ministerio.gob"]) == 0
    assert (await _roles())["jefa@ministerio.gob"] == "admin"


@pytest.mark.asyncio
async def test_the_grant_is_audited_and_marked_as_a_bootstrap() -> None:
    """The one grant nobody approved has to be identifiable, for ever."""
    await _reset()
    await _add_user("jefa@ministerio.gob")

    await main(["bootstrap-admin", "jefa@ministerio.gob"])

    assert await _audit_reasons() == ["bootstrap: first administrator"]


@pytest.mark.asyncio
async def test_it_refuses_once_an_administrator_exists() -> None:
    """A shell command that keeps working is a permanent side door.

    After the first one, promotion belongs in the product — where it is audited,
    reversible, and done by somebody accountable.
    """
    await _reset()
    await _add_user("jefa@ministerio.gob", role="admin")
    await _add_user("otro@ministerio.gob")

    assert await main(["bootstrap-admin", "otro@ministerio.gob"]) == 1
    assert (await _roles())["otro@ministerio.gob"] == "student"


@pytest.mark.asyncio
async def test_it_refuses_an_account_that_does_not_exist() -> None:
    # Creating one here would mean a password on the command line, where it
    # lands in shell history.
    await _reset()

    assert await main(["bootstrap-admin", "fantasma@ministerio.gob"]) == 1
    assert await _roles() == {}


@pytest.mark.asyncio
async def test_running_it_twice_on_the_same_person_is_harmless() -> None:
    await _reset()
    await _add_user("jefa@ministerio.gob")

    assert await main(["bootstrap-admin", "jefa@ministerio.gob"]) == 0
    assert await main(["bootstrap-admin", "jefa@ministerio.gob"]) == 0
    # And it did not write a second audit entry for a change that did not happen.
    assert len(await _audit_reasons()) == 1
