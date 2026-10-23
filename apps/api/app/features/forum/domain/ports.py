from typing import Protocol
from uuid import UUID

from app.features.forum.domain.entities import ForumPost, ForumThread


class ThreadRepository(Protocol):
    async def add(self, thread: ForumThread) -> None: ...

    async def get(self, thread_id: UUID) -> ForumThread | None: ...

    async def update(self, thread: ForumThread) -> None: ...

    async def list_for_module(
        self,
        *,
        course_id: UUID,
        module_id: UUID,
        cohort_id: UUID | None,
        limit: int = 50,
    ) -> list[ForumThread]:
        """Threads in a course/module/cohort forum, most recently active first.

        A null cohort represents the general forum for enrollments without
        cohort attribution.
        """
        ...

    async def list_by_author(
        self, author_id: UUID, *, course_ids: set[UUID], limit: int = 50
    ) -> list[ForumThread]: ...


class PostRepository(Protocol):
    async def add(self, post: ForumPost) -> None: ...

    async def get(self, post_id: UUID) -> ForumPost | None: ...

    async def update(self, post: ForumPost) -> None: ...

    async def list_for_thread(self, thread_id: UUID) -> list[ForumPost]: ...

    async def list_by_author(
        self, author_id: UUID, *, course_ids: set[UUID], limit: int = 50
    ) -> list[ForumPost]: ...
