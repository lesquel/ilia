"""PostgreSQL implementation of the forum ports."""

from uuid import UUID

from sqlalchemy import select

from app.core.database import Database
from app.features.forum.domain.entities import ForumPost, ForumThread

from .models import ForumPostModel, ForumThreadModel


def _to_thread(row: ForumThreadModel) -> ForumThread:
    return ForumThread(
        id=row.id,
        course_id=row.course_id,
        module_id=row.module_id,
        author_id=row.author_id,
        author_name=row.author_name,
        title=row.title,
        body=row.body,
        reply_count=row.reply_count,
        created_at=row.created_at,
        last_activity_at=row.last_activity_at,
        is_hidden=row.is_hidden,
        hidden_reason=row.hidden_reason,
    )


def _to_post(row: ForumPostModel) -> ForumPost:
    return ForumPost(
        id=row.id,
        thread_id=row.thread_id,
        author_id=row.author_id,
        author_name=row.author_name,
        body=row.body,
        created_at=row.created_at,
        is_hidden=row.is_hidden,
        hidden_reason=row.hidden_reason,
    )


class SqlAlchemyThreadRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def add(self, thread: ForumThread) -> None:
        async with self._db.session() as session:
            session.add(
                ForumThreadModel(
                    id=thread.id,
                    course_id=thread.course_id,
                    module_id=thread.module_id,
                    author_id=thread.author_id,
                    author_name=thread.author_name,
                    title=thread.title,
                    body=thread.body,
                    reply_count=thread.reply_count,
                    created_at=thread.created_at,
                    last_activity_at=thread.last_activity_at,
                )
            )

    async def get(self, thread_id: UUID) -> ForumThread | None:
        async with self._db.session() as session:
            row = await session.get(ForumThreadModel, thread_id)
            return _to_thread(row) if row else None

    async def update(self, thread: ForumThread) -> None:
        async with self._db.session() as session:
            row = await session.get(ForumThreadModel, thread.id)
            if row is None:
                return
            row.reply_count = thread.reply_count
            row.last_activity_at = thread.last_activity_at or row.last_activity_at
            row.is_hidden = thread.is_hidden
            row.hidden_reason = thread.hidden_reason

    async def list_for_course(
        self, *, course_id: UUID, module_id: UUID | None = None, limit: int = 50
    ) -> list[ForumThread]:
        statement = select(ForumThreadModel).where(ForumThreadModel.course_id == course_id)

        if module_id is not None:
            statement = statement.where(ForumThreadModel.module_id == module_id)

        statement = statement.order_by(ForumThreadModel.last_activity_at.desc()).limit(limit)

        async with self._db.session() as session:
            rows = (await session.execute(statement)).scalars().all()

        return [_to_thread(row) for row in rows]


class SqlAlchemyPostRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def add(self, post: ForumPost) -> None:
        async with self._db.session() as session:
            session.add(
                ForumPostModel(
                    id=post.id,
                    thread_id=post.thread_id,
                    author_id=post.author_id,
                    author_name=post.author_name,
                    body=post.body,
                    created_at=post.created_at,
                )
            )

    async def get(self, post_id: UUID) -> ForumPost | None:
        async with self._db.session() as session:
            row = await session.get(ForumPostModel, post_id)
            return _to_post(row) if row else None

    async def update(self, post: ForumPost) -> None:
        async with self._db.session() as session:
            row = await session.get(ForumPostModel, post.id)
            if row is None:
                return
            row.is_hidden = post.is_hidden
            row.hidden_reason = post.hidden_reason

    async def list_for_thread(self, thread_id: UUID) -> list[ForumPost]:
        async with self._db.session() as session:
            result = await session.execute(
                select(ForumPostModel)
                .where(ForumPostModel.thread_id == thread_id)
                # Oldest first: a conversation reads in the order it happened.
                .order_by(ForumPostModel.created_at)
            )
            return [_to_post(row) for row in result.scalars()]
