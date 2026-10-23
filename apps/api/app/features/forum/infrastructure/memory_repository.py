"""In-memory forum repositories, for fast tests and a database-less boot."""

from uuid import UUID

from app.features.forum.domain.entities import ForumPost, ForumThread


class InMemoryThreadRepository:
    def __init__(self, threads: list[ForumThread] | None = None) -> None:
        self._threads: dict[UUID, ForumThread] = {item.id: item for item in threads or []}

    async def add(self, thread: ForumThread) -> None:
        self._threads[thread.id] = thread

    async def get(self, thread_id: UUID) -> ForumThread | None:
        return self._threads.get(thread_id)

    async def update(self, thread: ForumThread) -> None:
        self._threads[thread.id] = thread

    async def list_for_module(
        self,
        *,
        course_id: UUID,
        module_id: UUID,
        cohort_id: UUID | None,
        limit: int = 50,
    ) -> list[ForumThread]:
        matching = [
            item
            for item in self._threads.values()
            if item.course_id == course_id
            and item.module_id == module_id
            and item.cohort_id == cohort_id
        ]

        matching.sort(
            key=lambda item: item.last_activity_at.timestamp() if item.last_activity_at else 0.0,
            reverse=True,
        )
        return matching[:limit]

    async def list_by_author(
        self, author_id: UUID, *, course_ids: set[UUID], limit: int = 50
    ) -> list[ForumThread]:
        matching = [
            item for item in self._threads.values()
            if item.author_id == author_id and item.course_id in course_ids
        ]
        matching.sort(
            key=lambda item: item.created_at.timestamp() if item.created_at else 0.0,
            reverse=True,
        )
        return matching[:limit]


class InMemoryPostRepository:
    def __init__(self, threads: InMemoryThreadRepository | None = None) -> None:
        self._posts: dict[UUID, ForumPost] = {}
        self._threads = threads

    async def add(self, post: ForumPost) -> None:
        self._posts[post.id] = post

    async def get(self, post_id: UUID) -> ForumPost | None:
        return self._posts.get(post_id)

    async def update(self, post: ForumPost) -> None:
        self._posts[post.id] = post

    async def list_for_thread(self, thread_id: UUID) -> list[ForumPost]:
        return sorted(
            (item for item in self._posts.values() if item.thread_id == thread_id),
            key=lambda item: item.created_at.timestamp() if item.created_at else 0.0,
        )

    async def list_by_author(
        self, author_id: UUID, *, course_ids: set[UUID], limit: int = 50
    ) -> list[ForumPost]:
        visible_thread_ids = {
            thread.id
            for thread in (self._threads._threads.values() if self._threads else [])
            if thread.course_id in course_ids
        }
        matching = [
            item for item in self._posts.values()
            if item.author_id == author_id and item.thread_id in visible_thread_ids
        ]
        matching.sort(
            key=lambda item: item.created_at.timestamp() if item.created_at else 0.0,
            reverse=True,
        )
        return matching[:limit]
