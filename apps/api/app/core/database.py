"""Database engine and session plumbing.

Lives in `core` because every feature's `infrastructure` needs it. Nothing here
knows about a single entity — the mapping of users, courses or submissions
belongs to each feature.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import Settings


class Base(DeclarativeBase):
    """Declarative base shared by every feature's ORM models.

    One base, one metadata, one Alembic history. Separate bases per feature
    would each need their own migration chain, and cross-feature foreign keys
    would stop being expressible.
    """


class Database:
    def __init__(self, settings: Settings) -> None:
        if settings.database_url is None:
            raise ValueError("ILIA_DATABASE_URL is required to build a Database")

        self._engine: AsyncEngine = create_async_engine(
            settings.database_url,
            echo=settings.debug and not settings.is_production,
            pool_pre_ping=True,
        )
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
