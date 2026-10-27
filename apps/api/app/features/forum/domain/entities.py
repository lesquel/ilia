"""Forum threads and replies (PRD E-07).

New threads belong to a course module, as specified by the PRD and mockup.
Every thread belongs to a module and optionally to an enrollment cohort; a
missing cohort means the general module forum for enrollments without one.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

MAX_TITLE_CHARS = 160
MAX_BODY_CHARS = 5000


@dataclass
class ForumPost:
    """A reply."""

    id: UUID
    thread_id: UUID
    author_id: UUID
    author_name: str
    body: str
    created_at: datetime | None = None
    # Moderated posts keep their row (PRD 5.2 gives instructors moderation over
    # their courses). Deleting outright would silently rewrite a conversation
    # other people already replied to.
    is_hidden: bool = False
    hidden_reason: str | None = None

    @classmethod
    def create(
        cls,
        *,
        thread_id: UUID,
        author_id: UUID,
        author_name: str,
        body: str,
        created_at: datetime | None = None,
    ) -> "ForumPost":
        cleaned = _clean_body(body)

        return cls(
            id=uuid4(),
            thread_id=thread_id,
            author_id=author_id,
            author_name=author_name,
            body=cleaned,
            created_at=created_at,
        )

    @property
    def visible_body(self) -> str:
        """What a reader sees.

        A hidden post is replaced, not removed: the shape of the conversation
        survives, and nobody is left wondering what the reply above them was
        answering.
        """
        return self.body if not self.is_hidden else "[Mensaje retirado por moderación]"


@dataclass
class ForumThread:
    id: UUID
    course_id: UUID
    cohort_id: UUID | None
    module_id: UUID
    author_id: UUID
    author_name: str
    title: str
    body: str
    created_at: datetime | None = None
    reply_count: int = 0
    # Threads are listed by this, not by creation date: a forum sorted by age
    # buries the conversation people are actually having.
    last_activity_at: datetime | None = None
    is_hidden: bool = False
    hidden_reason: str | None = None

    @classmethod
    def open(
        cls,
        *,
        course_id: UUID,
        cohort_id: UUID | None,
        author_id: UUID,
        author_name: str,
        title: str,
        body: str,
        module_id: UUID,
        created_at: datetime | None = None,
    ) -> "ForumThread":
        cleaned_title = title.strip()
        if not cleaned_title:
            raise ValueError("A thread needs a title")
        if len(cleaned_title) > MAX_TITLE_CHARS:
            raise ValueError(f"A title cannot exceed {MAX_TITLE_CHARS} characters")

        return cls(
            id=uuid4(),
            course_id=course_id,
            cohort_id=cohort_id,
            module_id=module_id,
            author_id=author_id,
            author_name=author_name,
            title=cleaned_title,
            body=_clean_body(body),
            created_at=created_at,
            last_activity_at=created_at,
        )

    @property
    def visible_body(self) -> str:
        return self.body if not self.is_hidden else "[Mensaje retirado por moderación]"

    def register_reply(self, at: datetime | None) -> None:
        self.reply_count += 1
        if at is not None:
            self.last_activity_at = at

    def hide(self, reason: str) -> None:
        cleaned = reason.strip()
        if not cleaned:
            raise ValueError("Moderating a message requires a reason")
        self.is_hidden = True
        self.hidden_reason = cleaned


def _clean_body(body: str) -> str:
    cleaned = body.strip()
    if not cleaned:
        raise ValueError("The message cannot be empty")
    if len(cleaned) > MAX_BODY_CHARS:
        raise ValueError(f"A message cannot exceed {MAX_BODY_CHARS} characters")
    return cleaned


@dataclass(frozen=True)
class ThreadWithPosts:
    thread: ForumThread
    posts: list[ForumPost]
