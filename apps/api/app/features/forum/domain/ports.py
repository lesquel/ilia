from typing import Protocol
from uuid import UUID

from app.features.forum.domain.entities import ForumPost, ForumThread


class ThreadRepository(Protocol):
    async def add(self, thread: ForumThread) -> None: ...

    async def get(self, thread_id: UUID) -> ForumThread | None: ...

    async def update(self, thread: ForumThread) -> None: ...

    async def list_for_course(
        self, *, course_id: UUID, module_id: UUID | None = None, limit: int = 50
    ) -> list[ForumThread]:
        """Threads in a course, most recently active first.

        A forum sorted by age buries the conversation people are actually
        having. `module_id` narrows to one module when the team wants that
        (TRD 7); omitted, it returns every thread in the course.
        """
        ...


class PostRepository(Protocol):
    async def add(self, post: ForumPost) -> None: ...

    async def get(self, post_id: UUID) -> ForumPost | None: ...

    async def update(self, post: ForumPost) -> None: ...

    async def list_for_thread(self, thread_id: UUID) -> list[ForumPost]: ...
