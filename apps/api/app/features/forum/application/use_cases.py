"""Forum use cases."""

from uuid import UUID

from app.features.auth.domain.entities import Role, User
from app.features.auth.domain.ports import Clock
from app.features.catalog.domain.entities import Course, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.domain.ports import CourseRepository
from app.features.enrollment.domain.ports import EnrollmentRepository
from app.features.forum.domain.entities import (
    ForumPost,
    ForumThread,
    ThreadWithPosts,
)
from app.features.forum.domain.errors import (
    ForumAccessDeniedError,
    InvalidMessageError,
    NotAModeratorError,
    ThreadNotFoundError,
)
from app.features.forum.domain.ports import PostRepository, ThreadRepository


async def _published_course(courses: CourseRepository, slug: str) -> Course:
    try:
        identifier = Slug(slug)
    except ValueError as exc:
        raise CourseNotFoundError(slug) from exc

    course = await courses.get_published_by_slug(identifier)
    if course is None:
        raise CourseNotFoundError(slug)

    return course


class ForumAccess:
    """Who may read and write in a course's forum.

    Enrollment is the gate today. The PRD's freemium table (§11) splits it
    further — free tier reads, paid tier participates — but the plan system does
    not exist yet, so that split is deliberately not faked here.
    """

    def __init__(self, *, courses: CourseRepository, enrollments: EnrollmentRepository) -> None:
        self._courses = courses
        self._enrollments = enrollments

    async def course_for(self, *, user: User, slug: str) -> Course:
        course = await _published_course(self._courses, slug)

        # An instructor or admin does not need to enrol in a course to moderate
        # it — they would otherwise have to join every course they oversee.
        if user.has_at_least(Role.INSTRUCTOR):
            return course

        enrollment = await self._enrollments.get(user_id=user.id, course_id=course.id)
        if enrollment is None:
            raise ForumAccessDeniedError()

        return course


class ListThreads:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        threads: ThreadRepository,
    ) -> None:
        self._access = ForumAccess(courses=courses, enrollments=enrollments)
        self._threads = threads

    async def execute(
        self, *, user: User, slug: str, module_id: UUID | None = None
    ) -> list[ForumThread]:
        course = await self._access.course_for(user=user, slug=slug)
        return await self._threads.list_for_course(course_id=course.id, module_id=module_id)


class OpenThread:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        threads: ThreadRepository,
        clock: Clock,
    ) -> None:
        self._access = ForumAccess(courses=courses, enrollments=enrollments)
        self._threads = threads
        self._clock = clock

    async def execute(
        self,
        *,
        user: User,
        slug: str,
        title: str,
        body: str,
        module_id: UUID | None = None,
    ) -> ForumThread:
        course = await self._access.course_for(user=user, slug=slug)

        try:
            thread = ForumThread.open(
                course_id=course.id,
                module_id=module_id,
                author_id=user.id,
                author_name=user.full_name,
                title=title,
                body=body,
                created_at=self._clock.now(),
            )
        except ValueError as exc:
            raise InvalidMessageError(str(exc)) from exc

        await self._threads.add(thread)
        return thread


class ReadThread:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        threads: ThreadRepository,
        posts: PostRepository,
    ) -> None:
        self._access = ForumAccess(courses=courses, enrollments=enrollments)
        self._threads = threads
        self._posts = posts

    async def execute(self, *, user: User, slug: str, thread_id: UUID) -> ThreadWithPosts:
        course = await self._access.course_for(user=user, slug=slug)

        thread = await self._threads.get(thread_id)
        # The thread must belong to *this* course. Without the check, any thread
        # id would be readable through any course the caller happens to be in.
        if thread is None or thread.course_id != course.id:
            raise ThreadNotFoundError()

        return ThreadWithPosts(thread=thread, posts=await self._posts.list_for_thread(thread_id))


class ReplyToThread:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        threads: ThreadRepository,
        posts: PostRepository,
        clock: Clock,
    ) -> None:
        self._access = ForumAccess(courses=courses, enrollments=enrollments)
        self._threads = threads
        self._posts = posts
        self._clock = clock

    async def execute(self, *, user: User, slug: str, thread_id: UUID, body: str) -> ForumPost:
        course = await self._access.course_for(user=user, slug=slug)

        thread = await self._threads.get(thread_id)
        if thread is None or thread.course_id != course.id:
            raise ThreadNotFoundError()

        now = self._clock.now()

        try:
            post = ForumPost.create(
                thread_id=thread_id,
                author_id=user.id,
                author_name=user.full_name,
                body=body,
                created_at=now,
            )
        except ValueError as exc:
            raise InvalidMessageError(str(exc)) from exc

        await self._posts.add(post)

        # Bump the thread so it rises in the listing. Stored rather than derived
        # because ordering a forum by a computed max() over every reply is a
        # sort the database has to redo on every page load.
        thread.register_reply(now)
        await self._threads.update(thread)

        return post


class ModerateMessage:
    """Hide a thread or a reply.

    Instructors moderate their own courses; admins moderate anything (PRD 5.2,
    5.3). Ownership is checked here, in the application layer, because it needs
    the course to decide — the role check alone lives in `interface`.
    """

    def __init__(
        self,
        *,
        courses: CourseRepository,
        threads: ThreadRepository,
        posts: PostRepository,
    ) -> None:
        self._courses = courses
        self._threads = threads
        self._posts = posts

    async def hide_thread(self, *, user: User, thread_id: UUID, reason: str) -> ForumThread:
        thread = await self._threads.get(thread_id)
        if thread is None:
            raise ThreadNotFoundError()

        await self._require_moderator(user, thread.course_id)

        try:
            thread.hide(reason)
        except ValueError as exc:
            raise InvalidMessageError(str(exc)) from exc

        await self._threads.update(thread)
        return thread

    async def hide_post(self, *, user: User, post_id: UUID, reason: str) -> ForumPost:
        post = await self._posts.get(post_id)
        if post is None:
            raise ThreadNotFoundError()

        thread = await self._threads.get(post.thread_id)
        if thread is None:
            raise ThreadNotFoundError()

        await self._require_moderator(user, thread.course_id)

        cleaned = reason.strip()
        if not cleaned:
            raise InvalidMessageError("Moderating a message requires a reason")

        post.is_hidden = True
        post.hidden_reason = cleaned
        await self._posts.update(post)
        return post

    async def _require_moderator(self, user: User, course_id: UUID) -> None:
        if user.role is Role.ADMIN:
            return

        if user.role is not Role.INSTRUCTOR:
            raise NotAModeratorError()

        course = await self._courses.get_by_id(course_id)
        # An instructor moderates their own courses, not everyone else's.
        if course is None or course.instructor_id != user.id:
            raise NotAModeratorError()
