"""Database engine and session plumbing.

Lives in `core` because every feature's `infrastructure` needs it. Nothing here
knows about a single entity — the mapping of users, courses or submissions
belongs to each feature.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
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

        database_options: dict[str, object] = {}
        if settings.database_url.startswith("sqlite+"):
            # PostgreSQL keeps each feature in its own schema. A local SQLite
            # file has no schemas, so map the same metadata into one namespace.
            database_options["execution_options"] = {
                "schema_translate_map": {schema.value: None for schema in DbSchema}
            }

        self._engine: AsyncEngine = create_async_engine(
            settings.database_url,
            echo=settings.debug and not settings.is_production,
            pool_pre_ping=True,
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
    async def session(self) -> AsyncIterator[AsyncSession]:
        """One transaction per unit of work.

        Commit on success, roll back on any exception. A repository never
        commits on its own: whether a use case's writes land together is the use
        case's business, not the repository's.
        """
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def dispose(self) -> None:
        await self._engine.dispose()


def _enable_sqlite_foreign_keys(connection, _record) -> None:  # type: ignore[no-untyped-def]
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
