"""Forum endpoints (PRD E-07). All authenticated."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

from app.features.auth.application.avatar_use_cases import avatar_read_url
from app.features.auth.domain.entities import Role, User
from app.features.auth.interface.dependencies import CurrentUser, UsersDep
from app.features.billing.application.use_cases import require_posting
from app.features.billing.interface.dependencies import EntitlementsDep
from app.features.catalog.domain.entities import CatalogFilters
from app.features.catalog.interface.router import CoursesDep
from app.features.enrollment.interface.dependencies import CohortsDep, EnrollmentsDep
from app.features.forum.application.use_cases import (
    ListThreads,
    ModerateMessage,
    OpenThread,
    ReadThread,
    ReplyToThread,
    may_moderate,
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
    author_id: UUID
    title: str
    author_name: str
    author_avatar_key: str | None = None
    author_avatar_url: str | None = None
    reply_count: int
    created_at: datetime | None
    last_activity_at: datetime | None
    is_hidden: bool
    # Decided by the server with the same rule that enforces it, so the client
    # never has to guess who may moderate.
    can_moderate: bool = False

    @classmethod
    def from_entity(
        cls,
        thread: ForumThread,
        *,
        can_moderate: bool = False,
        author: User | None = None,
        avatar_url: str | None = None,
    ) -> "ThreadSummaryResponse":
        return cls(
            id=thread.id,
            author_id=thread.author_id,
            title=thread.title,
            author_name=author.full_name if author else thread.author_name,
            author_avatar_key=author.avatar_key if author else None,
            author_avatar_url=avatar_url,
            reply_count=thread.reply_count,
            created_at=thread.created_at,
            last_activity_at=thread.last_activity_at,
            is_hidden=thread.is_hidden,
            can_moderate=can_moderate,
        )


class PostResponse(BaseModel):
    id: UUID
    author_id: UUID
    author_name: str
    author_avatar_key: str | None = None
    author_avatar_url: str | None = None
    body: str
    created_at: datetime | None
    is_hidden: bool

    @classmethod
    def from_entity(
        cls, post: ForumPost, *, author: User | None = None, avatar_url: str | None = None
    ) -> "PostResponse":
        return cls(
            id=post.id,
            author_id=post.author_id,
            author_name=author.full_name if author else post.author_name,
            author_avatar_key=author.avatar_key if author else None,
            author_avatar_url=avatar_url,
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
    module_id: UUID
    cohort_id: UUID | None = None


class ReplyRequest(BaseModel):
    body: str = Field(min_length=1, max_length=MAX_BODY_CHARS)


class ModerateRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class CommunityForumSpaceResponse(BaseModel):
    cohort_id: UUID | None
    cohort_title: str | None


class CommunityModuleResponse(BaseModel):
    id: UUID
    title: str
    forums: list[CommunityForumSpaceResponse]


class CommunityCourseResponse(BaseModel):
    slug: str
    title: str
    summary: str
    modules: list[CommunityModuleResponse]


class CommunityCoursesResponse(BaseModel):
    courses: list[CommunityCourseResponse]


class CommunityActivityResponse(BaseModel):
    kind: str
    course_slug: str
    course_title: str
    thread_id: UUID
    thread_title: str
    module_id: UUID
    module_title: str
    cohort_id: UUID | None
    cohort_title: str | None
    created_at: datetime | None


class CommunityMemberResponse(BaseModel):
    id: UUID
    full_name: str
    avatar_key: str | None = None
    avatar_url: str | None = None
    activity: list[CommunityActivityResponse]


@router.get("/community", response_model=CommunityCoursesResponse)
async def community_courses(
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    cohorts: CohortsDep,
) -> CommunityCoursesResponse:
    visible: list[CommunityCourseResponse] = []
    enrolled_ids = None
    if not user.has_at_least(Role.INSTRUCTOR):
        enrolled_ids = {item.course_id for item in await enrollments.list_for_user(user.id)}
    cohort_titles = {item.id: item.name for item in await cohorts.list_all()}
    cursor: str | None = None
    while True:
        page = await courses.list_published(filters=CatalogFilters(), limit=100, cursor=cursor)
        for item in page.items:
            if enrolled_ids is not None and item.id not in enrolled_ids:
                continue
            course = await courses.get_published_by_slug(item.slug)
            course_enrollments = await enrollments.list_for_course(item.id)
            if enrolled_ids is not None:
                contexts = {
                    enrollment.cohort_id
                    for enrollment in course_enrollments
                    if enrollment.user_id == user.id
                }
            else:
                contexts = {enrollment.cohort_id for enrollment in course_enrollments}
            if not contexts:
                contexts = {None}
            visible.append(
                CommunityCourseResponse(
                    slug=str(item.slug),
                    title=item.title,
                    summary=item.summary,
                    modules=[
                        CommunityModuleResponse(
                            id=module.id,
                            title=module.title,
                            forums=[
                                CommunityForumSpaceResponse(
                                    cohort_id=cohort_id,
                                    cohort_title=cohort_titles.get(cohort_id)
                                    if cohort_id
                                    else None,
                                )
                                for cohort_id in sorted(
                                    contexts, key=lambda value: str(value or "")
                                )
                            ],
                        )
                        for module in course.ordered_modules
                    ] if course else [],
                )
            )
        if page.next_cursor is None:
            return CommunityCoursesResponse(courses=visible)
        cursor = page.next_cursor


@router.get("/community/members/{member_id}", response_model=CommunityMemberResponse)
async def community_member(
    member_id: UUID,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    threads: ThreadsDep,
    posts: PostsDep,
    users: UsersDep,
    cohorts: CohortsDep,
    request: Request,
) -> CommunityMemberResponse:
    from app.shared.errors import NotFoundError

    member = await users.get_by_id(member_id)
    if member is None or not member.is_active:
        raise NotFoundError("Member not found")

    cohort_titles = {item.id: item.name for item in await cohorts.list_all()}

    async def readable_courses(person: User) -> dict[UUID, CommunityCourseResponse]:
        enrolled = None
        user_enrollments = []
        if not person.has_at_least(Role.INSTRUCTOR):
            user_enrollments = await enrollments.list_for_user(person.id)
            enrolled = {item.course_id for item in user_enrollments}
        result: dict[UUID, CommunityCourseResponse] = {}
        cursor: str | None = None
        while True:
            page = await courses.list_published(filters=CatalogFilters(), limit=100, cursor=cursor)
            for course in page.items:
                if enrolled is None or course.id in enrolled:
                    detail = await courses.get_published_by_slug(course.slug)
                    course_enrollments = (
                        user_enrollments
                        if enrolled is not None
                        else await enrollments.list_for_course(course.id)
                    )
                    contexts = {
                        enrollment.cohort_id
                        for enrollment in course_enrollments
                        if enrollment.course_id == course.id
                        and (enrolled is None or enrollment.user_id == person.id)
                    }
                    if not contexts:
                        contexts = {None}
                    result[course.id] = CommunityCourseResponse(
                        slug=str(course.slug),
                        title=course.title,
                        summary=course.summary,
                        modules=[
                            CommunityModuleResponse(
                                id=module.id,
                                title=module.title,
                                forums=[
                                    CommunityForumSpaceResponse(
                                        cohort_id=cohort_id,
                                        cohort_title=cohort_titles.get(cohort_id)
                                        if cohort_id
                                        else None,
                                    )
                                    for cohort_id in sorted(
                                        contexts, key=lambda value: str(value or "")
                                    )
                                ],
                            )
                            for module in detail.ordered_modules
                        ] if detail else [],
                    )
            if page.next_cursor is None:
                return result
            cursor = page.next_cursor

    reader_courses = await readable_courses(user)
    member_courses = await readable_courses(member)
    is_self = member.id == user.id

    async def readable_forum_scopes(
        person: User, visible_courses: dict[UUID, CommunityCourseResponse]
    ) -> set[tuple[UUID, UUID, UUID | None]]:
        result: set[tuple[UUID, UUID, UUID | None]] = set()
        if person.has_at_least(Role.INSTRUCTOR):
            for course_id, visible_course in visible_courses.items():
                course_enrollments = await enrollments.list_for_course(course_id)
                contexts = {item.cohort_id for item in course_enrollments}
                if not contexts:
                    contexts = {None}
                for module in visible_course.modules:
                    result.update((course_id, module.id, cohort_id) for cohort_id in contexts)
            return result

        for enrollment in await enrollments.list_for_user(person.id):
            candidate_course = visible_courses.get(enrollment.course_id)
            if candidate_course:
                result.update(
                    (enrollment.course_id, module.id, enrollment.cohort_id)
                    for module in candidate_course.modules
                )
        return result

    reader_scopes = await readable_forum_scopes(user, reader_courses)
    member_scopes = await readable_forum_scopes(member, member_courses)
    shared_scopes = reader_scopes & member_scopes
    if not shared_scopes and not is_self:
        raise NotFoundError("Member not found")
    visible_scopes = member_scopes if is_self else shared_scopes
    activity_course_ids = {course_id for course_id, _, _ in visible_scopes}
    authored_threads = await threads.list_by_author(
        member.id, course_ids=activity_course_ids, limit=100
    )
    authored_posts = await posts.list_by_author(
        member.id, course_ids=activity_course_ids, limit=100
    )
    thread_by_id = {item.id: item for item in authored_threads}
    related_threads: dict[UUID, ForumThread | None] = dict(thread_by_id)
    activity: list[CommunityActivityResponse] = []
    for authored_thread in authored_threads:
        course = reader_courses.get(authored_thread.course_id) or member_courses.get(
            authored_thread.course_id
        )
        if (
            course
            and (authored_thread.course_id, authored_thread.module_id, authored_thread.cohort_id)
            in visible_scopes
            and not authored_thread.is_hidden
        ):
            activity.append(
                CommunityActivityResponse(
                    kind="discussion",
                    course_slug=course.slug,
                    course_title=course.title,
                    thread_id=authored_thread.id,
                    thread_title=authored_thread.title,
                    created_at=authored_thread.created_at,
                    module_id=authored_thread.module_id,
                    module_title=next(
                        (
                            item.title
                            for item in course.modules
                            if item.id == authored_thread.module_id
                        ),
                        "",
                    ),
                    cohort_id=authored_thread.cohort_id,
                    cohort_title=cohort_titles.get(authored_thread.cohort_id)
                    if authored_thread.cohort_id
                    else None,
                )
            )
    for post in authored_posts:
        if post.is_hidden:
            continue
        if post.thread_id not in related_threads:
            related_threads[post.thread_id] = await threads.get(post.thread_id)
        thread = related_threads[post.thread_id]
        if (
            thread is None
            or thread.is_hidden
            or thread.course_id not in activity_course_ids
            or (thread.course_id, thread.module_id, thread.cohort_id) not in visible_scopes
        ):
            continue
        course = reader_courses.get(thread.course_id) or member_courses.get(thread.course_id)
        if course:
            activity.append(
                CommunityActivityResponse(
                    kind="reply",
                    course_slug=course.slug,
                    course_title=course.title,
                    thread_id=thread.id,
                    thread_title=thread.title,
                    created_at=post.created_at,
                    module_id=thread.module_id,
                    module_title=next(
                        (item.title for item in course.modules if item.id == thread.module_id),
                        "",
                    ),
                    cohort_id=thread.cohort_id,
                    cohort_title=cohort_titles.get(thread.cohort_id)
                    if thread.cohort_id
                    else None,
                )
            )
    activity.sort(
        key=lambda item: item.created_at.timestamp() if item.created_at else 0,
        reverse=True,
    )
    return CommunityMemberResponse(
        id=member.id,
        full_name=member.full_name,
        avatar_key=member.avatar_key,
        avatar_url=(
            avatar_read_url(member, request.app.state.storage)
            if is_self or shared_scopes
            else None
        ),
        activity=activity[:50],
    )


@router.get("/{slug}/threads", response_model=list[ThreadSummaryResponse])
async def list_threads(
    slug: str,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    threads: ThreadsDep,
    users: UsersDep,
    request: Request,
    module_id: UUID,
    cohort_id: UUID | None = None,
) -> list[ThreadSummaryResponse]:
    """Threads of one module and cohort; no cohort means the general forum."""
    found = await ListThreads(courses=courses, enrollments=enrollments, threads=threads).execute(
        user=user, slug=slug, module_id=module_id, cohort_id=cohort_id
    )

    # Every thread in a listing belongs to the same course, so the rule is
    # evaluated once rather than per row.
    moderator = bool(found and await may_moderate(courses, user=user, course_id=found[0].course_id))

    authors = await users.get_by_ids({item.author_id for item in found})
    by_id = {author.id: author for author in authors}
    storage = request.app.state.storage
    return [
        ThreadSummaryResponse.from_entity(
            item,
            can_moderate=moderator,
            author=by_id.get(item.author_id),
            avatar_url=(
                avatar_read_url(by_id[item.author_id], storage)
                if item.author_id in by_id
                else None
            ),
        )
        for item in found
    ]


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
    entitlements: EntitlementsDep,
) -> ThreadDetailResponse:
    # Free reads, paid writes (PRD 11).
    if entitlements is not None:
        require_posting(entitlements)

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
        cohort_id=payload.cohort_id,
    )
    author_avatar_url = avatar_read_url(user, request.app.state.storage)

    return ThreadDetailResponse(
        **ThreadSummaryResponse.from_entity(
            thread, author=user, avatar_url=author_avatar_url
        ).model_dump(),
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
    users: UsersDep,
    request: Request,
    cohort_id: UUID | None = None,
) -> ThreadDetailResponse:
    result = await ReadThread(
        courses=courses, enrollments=enrollments, threads=threads, posts=posts
    ).execute(user=user, slug=slug, thread_id=thread_id, cohort_id=cohort_id)

    moderator = await may_moderate(courses, user=user, course_id=result.thread.course_id)
    author_ids = {result.thread.author_id, *(item.author_id for item in result.posts)}
    authors = {item.id: item for item in await users.get_by_ids(author_ids)}
    storage = request.app.state.storage
    thread_author = authors.get(result.thread.author_id)

    return ThreadDetailResponse(
        **ThreadSummaryResponse.from_entity(
            result.thread,
            can_moderate=moderator,
            author=thread_author,
            avatar_url=avatar_read_url(thread_author, storage) if thread_author else None,
        ).model_dump(),
        body=result.thread.visible_body,
        posts=[
            PostResponse.from_entity(
                item,
                author=authors.get(item.author_id),
                avatar_url=(
                    avatar_read_url(authors[item.author_id], storage)
                    if item.author_id in authors
                    else None
                ),
            )
            for item in result.posts
        ],
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
    entitlements: EntitlementsDep,
    cohort_id: UUID | None = None,
) -> PostResponse:
    if entitlements is not None:
        require_posting(entitlements)

    post = await ReplyToThread(
        courses=courses,
        enrollments=enrollments,
        threads=threads,
        posts=posts,
        clock=request.app.state.auth["clock"],
    ).execute(
        user=user,
        slug=slug,
        thread_id=thread_id,
        cohort_id=cohort_id,
        body=payload.body,
    )

    return PostResponse.from_entity(
        post, author=user, avatar_url=avatar_read_url(user, request.app.state.storage)
    )


@router.post("/threads/{thread_id}/hide", response_model=ThreadSummaryResponse)
async def hide_thread(
    thread_id: UUID,
    payload: ModerateRequest,
    user: CurrentUser,
    courses: CoursesDep,
    threads: ThreadsDep,
    posts: PostsDep,
    users: UsersDep,
    request: Request,
) -> ThreadSummaryResponse:
    """Moderate a thread.

    The role gate is not a simple `require_role`: an instructor may only
    moderate their own courses, and that needs the course to decide — so the
    check lives in the use case.
    """
    thread = await ModerateMessage(courses=courses, threads=threads, posts=posts).hide_thread(
        user=user, thread_id=thread_id, reason=payload.reason
    )

    author = await users.get_by_id(thread.author_id)
    return ThreadSummaryResponse.from_entity(
        thread,
        author=author,
        avatar_url=(avatar_read_url(author, request.app.state.storage) if author else None),
    )


@router.post("/posts/{post_id}/hide", response_model=PostResponse)
async def hide_post(
    post_id: UUID,
    payload: ModerateRequest,
    user: CurrentUser,
    courses: CoursesDep,
    threads: ThreadsDep,
    posts: PostsDep,
    users: UsersDep,
    request: Request,
) -> PostResponse:
    post = await ModerateMessage(courses=courses, threads=threads, posts=posts).hide_post(
        user=user, post_id=post_id, reason=payload.reason
    )

    author = await users.get_by_id(post.author_id)
    return PostResponse.from_entity(
        post,
        author=author,
        avatar_url=(avatar_read_url(author, request.app.state.storage) if author else None),
    )
