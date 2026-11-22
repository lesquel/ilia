"""Database engine and session plumbing.

Lives in `core` because every feature's `infrastructure` needs it. Nothing here
knows about a single entity — the mapping of users, courses or submissions
belongs to each feature.
"""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from contextvars import ContextVar

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, ORMExecuteState
from sqlalchemy.schema import CreateSchema

from app.core.config import Settings
from app.core.schemas import DbSchema


class Base(DeclarativeBase):
    """Declarative base shared by every feature's ORM models.

    One base, one metadata, one Alembic history. Separate bases per feature
    would each need their own migration chain, and cross-feature foreign keys
    would stop being expressible.
    """


@event.listens_for(Base.metadata, "before_create")
def _create_schemas_for_metadata(_target, connection, **_: object) -> None:  # type: ignore[no-untyped-def]
    """Create application schemas for test/dev `metadata.create_all` runs."""
    if connection.dialect.name != "postgresql":
        return
    for schema in DbSchema:
        connection.execute(CreateSchema(schema.value, if_not_exists=True))


class Database:
    def __init__(self, settings: Settings) -> None:
        if settings.database_url is None:
            raise ValueError("ILIA_DATABASE_URL is required to build a Database")

        connect_args: dict[str, object] = {}
        database_options: dict[str, object] = {}
        if settings.database_url.startswith("postgresql+asyncpg"):
            # The Supabase transaction pooler is PgBouncer. asyncpg caches
            # prepared statements unless this is zero, and PgBouncer then
            # rejects the next query on that connection. A direct Postgres
            # still answers with the cache turned off.
            connect_args["statement_cache_size"] = 0
        if settings.database_url.startswith("sqlite+"):
            # PostgreSQL keeps each feature in its own schema. A local SQLite
            # file has no schemas, so map the same metadata into one namespace.
            database_options["execution_options"] = {
                "schema_translate_map": {schema.value: None for schema in DbSchema}
            }

        self._engine: AsyncEngine = create_async_engine(
            settings.database_url,
            echo=settings.debug and not settings.is_production,
            pool_pre_ping=settings.db_pool_pre_ping,
            connect_args=connect_args,
            **database_options,
        )
        if settings.database_url.startswith("sqlite+"):
            event.listen(self._engine.sync_engine, "connect", _enable_sqlite_foreign_keys)
        self._session_factory = async_sessionmaker(
            self._engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )

    @property
    def engine(self) -> AsyncEngine:
        return self._engine

    @asynccontextmanager
    async def request_scope(self) -> AsyncIterator[None]:
        """Share one session among every `session()` block of one HTTP request.

        Each pooled session pays a pre-ping, a BEGIN and a COMMIT; against a
        remote pooler that was most of a request's time. Inside this scope the
        request's own task reuses one session. What does not change: a block
        that writes commits when it ends, a failing block rolls back, and any
        other task (the background evaluation queue) gets its own session.

        Two differences from a private session per block, both accepted:
        nested blocks commit once, at the outermost block's end (no repository
        nests blocks today); and between blocks a read keeps its transaction,
        and so its pooled connection, open until the next write or the end of
        the request, including across non-database awaits.
        """
        unit = _RequestUnit(asyncio.current_task())
        token = _request_unit.set(unit)
        try:
            yield
        finally:
            _request_unit.reset(token)
            unit.closed = True
            if unit.session is not None:
                try:
                    # Only reads can be pending here: writes committed when
                    # their block ended.
                    if unit.session.in_transaction():
                        await unit.session.commit()
                finally:
                    await unit.session.close()

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """One transaction per unit of work.

        Commit on success, roll back on any exception. A repository never
        commits on its own: whether a use case's writes land together is the use
        case's business, not the repository's.
        """
        unit = _request_unit.get()
        if unit is None or unit.closed or asyncio.current_task() is not unit.owner:
            async with self._session_factory() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
            return

        if unit.session is None:
            unit.session = self._session_factory()
            _watch_shared_session(unit)
        session = unit.session
        unit.depth += 1
        try:
            yield session
            if unit.depth == 1:
                if unit.wrote or session.new or session.dirty or session.deleted:
                    await session.commit()
                    unit.wrote = False
                # Forget what this block loaded: the next block reads fresh rows,
                # `session.get` included, exactly as a private session would.
                session.expunge_all()
        except BaseException:
            await session.rollback()
            unit.wrote = False
            raise
        finally:
            unit.depth -= 1

    async def dispose(self) -> None:
        await self._engine.dispose()


class _RequestUnit:
    """The session one request shares, and who may use it."""

    def __init__(self, owner: "asyncio.Task[object] | None") -> None:
        self.owner = owner
        self.session: AsyncSession | None = None
        self.depth = 0
        self.wrote = False
        self.closed = False


_request_unit: ContextVar[_RequestUnit | None] = ContextVar("ilia_request_unit", default=None)


def _watch_shared_session(unit: _RequestUnit) -> None:
    """Mark writes, and keep reads fresh across the request's blocks.

    A private session per block always read fresh rows. A shared one keeps an
    identity map, so every ORM select refreshes the objects it returns
    (`populate_existing`) instead of handing back what an earlier block loaded.
    """
    assert unit.session is not None

    @event.listens_for(unit.session.sync_session, "do_orm_execute")
    def _on_execute(state: ORMExecuteState) -> None:
        if state.is_select:
            state.update_execution_options(populate_existing=True)
        else:
            unit.wrote = True

    @event.listens_for(unit.session.sync_session, "after_flush")
    def _on_flush(_session, _context) -> None:  # type: ignore[no-untyped-def]
        unit.wrote = True


def _enable_sqlite_foreign_keys(connection, _record) -> None:  # type: ignore[no-untyped-def]
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
