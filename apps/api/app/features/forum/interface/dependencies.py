from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.forum.domain.ports import PostRepository, ThreadRepository
from app.features.forum.infrastructure.memory_repository import (
    InMemoryPostRepository,
    InMemoryThreadRepository,
)
from app.features.forum.infrastructure.sql_repository import (
    SqlAlchemyPostRepository,
    SqlAlchemyThreadRepository,
)


def build_forum_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is not None:
        return {
            "threads": SqlAlchemyThreadRepository(database),
            "posts": SqlAlchemyPostRepository(database),
        }

    structlog.get_logger().warning(
        "forum_using_in_memory_repositories",
        detail="ILIA_DATABASE_URL is not set; discussions will be lost on restart",
    )
    threads = InMemoryThreadRepository()
    return {"threads": threads, "posts": InMemoryPostRepository(threads)}


def get_threads(request: Request) -> ThreadRepository:
    return request.app.state.forum["threads"]  # type: ignore[no-any-return]


def get_posts(request: Request) -> PostRepository:
    return request.app.state.forum["posts"]  # type: ignore[no-any-return]


ThreadsDep = Annotated[ThreadRepository, Depends(get_threads)]
PostsDep = Annotated[PostRepository, Depends(get_posts)]
