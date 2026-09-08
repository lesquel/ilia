"""Forum endpoints (PRD E-07). All authenticated."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

from app.features.auth.interface.dependencies import CurrentUser
from app.features.catalog.interface.router import CoursesDep
from app.features.enrollment.interface.dependencies import EnrollmentsDep
from app.features.forum.application.use_cases import (
    ListThreads,
    ModerateMessage,
    OpenThread,
    ReadThread,
    ReplyToThread,
)
from app.features.forum.domain.entities import (
    MAX_BODY_CHARS,
    MAX_TITLE_CHARS,
    ForumPost,
    ForumThread,
)
from app.features.forum.interface.dependencies import PostsDep, ThreadsDep

router = APIRouter(prefix="/forum", tags=["forum"])


class ThreadSummaryResponse(BaseModel):
    id: UUID
    title: str
    author_name: str
    reply_count: int
    created_at: datetime | None
    last_activity_at: datetime | None
    is_hidden: bool

    @classmethod
    def from_entity(cls, thread: ForumThread) -> "ThreadSummaryResponse":
        return cls(
            id=thread.id,
            title=thread.title,
            author_name=thread.author_name,
            reply_count=thread.reply_count,
            created_at=thread.created_at,
            last_activity_at=thread.last_activity_at,
            is_hidden=thread.is_hidden,
        )


class PostResponse(BaseModel):
    id: UUID
    author_name: str
    body: str
    created_at: datetime | None
    is_hidden: bool

    @classmethod
    def from_entity(cls, post: ForumPost) -> "PostResponse":
        return cls(
            id=post.id,
            author_name=post.author_name,
            # The moderated placeholder, never the original text.
            body=post.visible_body,
            created_at=post.created_at,
            is_hidden=post.is_hidden,
        )


class ThreadDetailResponse(ThreadSummaryResponse):
    body: str
    posts: list[PostResponse]


class OpenThreadRequest(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_TITLE_CHARS)
    body: str = Field(min_length=1, max_length=MAX_BODY_CHARS)
    module_id: UUID | None = None


class ReplyRequest(BaseModel):
    body: str = Field(min_length=1, max_length=MAX_BODY_CHARS)


class ModerateRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


@router.get("/{slug}/threads", response_model=list[ThreadSummaryResponse])
async def list_threads(
    slug: str,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    threads: ThreadsDep,
    module_id: UUID | None = None,
) -> list[ThreadSummaryResponse]:
    """Course threads, most recently active first.

    `module_id` narrows to one module. Omitted, it returns the whole course —
    which is what the mockup shows.
    """
    found = await ListThreads(courses=courses, enrollments=enrollments, threads=threads).execute(
        user=user, slug=slug, module_id=module_id
    )

    return [ThreadSummaryResponse.from_entity(item) for item in found]


@router.post(
    "/{slug}/threads", response_model=ThreadDetailResponse, status_code=status.HTTP_201_CREATED
)
async def open_thread(
    slug: str,
    payload: OpenThreadRequest,
    request: Request,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    threads: ThreadsDep,
) -> ThreadDetailResponse:
    thread = await OpenThread(
        courses=courses,
        enrollments=enrollments,
        threads=threads,
        clock=request.app.state.auth["clock"],
    ).execute(
        user=user,
        slug=slug,
        title=payload.title,
        body=payload.body,
        module_id=payload.module_id,
    )

    return ThreadDetailResponse(
        **ThreadSummaryResponse.from_entity(thread).model_dump(),
        body=thread.visible_body,
        posts=[],
    )


@router.get("/{slug}/threads/{thread_id}", response_model=ThreadDetailResponse)
async def read_thread(
    slug: str,
    thread_id: UUID,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    threads: ThreadsDep,
    posts: PostsDep,
) -> ThreadDetailResponse:
    result = await ReadThread(
        courses=courses, enrollments=enrollments, threads=threads, posts=posts
    ).execute(user=user, slug=slug, thread_id=thread_id)

    return ThreadDetailResponse(
        **ThreadSummaryResponse.from_entity(result.thread).model_dump(),
        body=result.thread.visible_body,
        posts=[PostResponse.from_entity(item) for item in result.posts],
    )


@router.post(
    "/{slug}/threads/{thread_id}/replies",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
async def reply(
    slug: str,
    thread_id: UUID,
    payload: ReplyRequest,
    request: Request,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    threads: ThreadsDep,
    posts: PostsDep,
) -> PostResponse:
    post = await ReplyToThread(
        courses=courses,
        enrollments=enrollments,
        threads=threads,
        posts=posts,
        clock=request.app.state.auth["clock"],
    ).execute(user=user, slug=slug, thread_id=thread_id, body=payload.body)

    return PostResponse.from_entity(post)


@router.post("/threads/{thread_id}/hide", response_model=ThreadSummaryResponse)
async def hide_thread(
    thread_id: UUID,
    payload: ModerateRequest,
    user: CurrentUser,
    courses: CoursesDep,
    threads: ThreadsDep,
    posts: PostsDep,
) -> ThreadSummaryResponse:
    """Moderate a thread.

    The role gate is not a simple `require_role`: an instructor may only
    moderate their own courses, and that needs the course to decide — so the
    check lives in the use case.
    """
    thread = await ModerateMessage(courses=courses, threads=threads, posts=posts).hide_thread(
        user=user, thread_id=thread_id, reason=payload.reason
    )

    return ThreadSummaryResponse.from_entity(thread)


@router.post("/posts/{post_id}/hide", response_model=PostResponse)
async def hide_post(
    post_id: UUID,
    payload: ModerateRequest,
    user: CurrentUser,
    courses: CoursesDep,
    threads: ThreadsDep,
    posts: PostsDep,
) -> PostResponse:
    post = await ModerateMessage(courses=courses, threads=threads, posts=posts).hide_post(
        user=user, post_id=post_id, reason=payload.reason
    )

    return PostResponse.from_entity(post)
