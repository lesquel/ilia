"""One pooled session per HTTP request, with the old commit semantics kept.

These pin the rules `Database.request_scope` promises: blocks in one request
share a session, a block that writes commits when it ends, a failing block
rolls back only itself, reads are never stale, and any other task gets its
own session.
"""

import asyncio
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import String, select, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import Settings
from app.core.database import Database


class _Base(DeclarativeBase):
    pass


class _Note(_Base):
    __tablename__ = "note"

    id: Mapped[int] = mapped_column(primary_key=True)
    body: Mapped[str] = mapped_column(String(40))


@pytest.fixture
async def database(tmp_path) -> AsyncIterator[Database]:  # type: ignore[no-untyped-def]
    url = URL.create("sqlite+aiosqlite", database=str(tmp_path / "unit.sqlite3"))
    db = Database(
        Settings(
            environment="local",
            database_url=url.render_as_string(hide_password=False),
            jwt_secret="request-session-test-key-that-is-long-enough",
        )
    )
    async with db.engine.begin() as connection:
        await connection.run_sync(_Base.metadata.create_all)
    yield db
    await db.dispose()


async def _body_seen_by_another_connection(db: Database, note_id: int) -> str | None:
    async with db.engine.connect() as connection:
        row = await connection.execute(
            text("SELECT body FROM note WHERE id = :id"), {"id": note_id}
        )
        return row.scalar_one_or_none()


async def test_blocks_in_one_request_share_one_session(database: Database) -> None:
    async with database.request_scope():
        async with database.session() as first:
            pass
        async with database.session() as second:
            pass
    assert first is second


async def test_outside_a_request_every_block_gets_its_own_session(database: Database) -> None:
    async with database.session() as first:
        pass
    async with database.session() as second:
        pass
    assert first is not second


async def test_another_task_gets_its_own_session(database: Database) -> None:
    # The background evaluation queue starts tasks during a request; an
    # AsyncSession must never be used by two tasks at once.
    async with database.request_scope():
        async with database.session() as mine:
            pass

        async def elsewhere() -> object:
            async with database.session() as theirs:
                return theirs

        theirs = await asyncio.create_task(elsewhere())
    assert theirs is not mine


async def test_a_writing_block_commits_when_it_ends(database: Database) -> None:
    async with database.request_scope():
        async with database.session() as session:
            session.add(_Note(id=1, body="first"))
        # Committed before the request goes on, as with a private session.
        assert await _body_seen_by_another_connection(database, 1) == "first"


async def test_a_failing_block_rolls_back_only_itself(database: Database) -> None:
    async with database.request_scope():
        async with database.session() as session:
            session.add(_Note(id=1, body="kept"))
        with pytest.raises(RuntimeError):
            async with database.session() as session:
                session.add(_Note(id=2, body="dropped"))
                raise RuntimeError("boom")
        async with database.session() as session:
            bodies = (await session.execute(select(_Note.body).order_by(_Note.id))).scalars().all()
    assert list(bodies) == ["kept"]
    assert await _body_seen_by_another_connection(database, 2) is None


async def test_reads_in_one_request_are_never_stale(database: Database) -> None:
    async with database.session() as session:
        session.add(_Note(id=1, body="before"))
    async with database.request_scope():
        async with database.session() as session:
            note = (await session.execute(select(_Note).where(_Note.id == 1))).scalar_one()
            assert note.body == "before"
        async with database.session() as session:
            await session.execute(text("UPDATE note SET body = 'after' WHERE id = 1"))
        async with database.session() as session:
            again = (await session.execute(select(_Note).where(_Note.id == 1))).scalar_one()
    assert again.body == "after"
