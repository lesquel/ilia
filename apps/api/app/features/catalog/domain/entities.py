"""Catalog domain: course, module and lesson.

Pure Python. The catalog is the one part of the product a teacher sees before
deciding to trust it, so the rules about what is visible live here and not in a
query someone might forget to filter.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID

_SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


class Level(StrEnum):
    """Learning path levels (PRD 11: básico → experto)."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    EXPERT = "expert"


class CourseStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    # Withdrawn from the catalog without being deleted: enrolled teachers keep
    # their access and their certificates stay verifiable (PRD A-04).
    ARCHIVED = "archived"


class LessonKind(StrEnum):
    VIDEO = "video"
    SLIDES = "slides"
    TEXT = "text"
    QUIZ = "quiz"


@dataclass(frozen=True)
class Slug:
    """URL-safe identifier for a course.

    Courses are addressed by slug and not by UUID because the web client is
    expected to produce shareable links (TRD 4.5), and a link a teacher can read
    is a link a teacher will send to a colleague.
    """

    value: str

    def __post_init__(self) -> None:
        normalized = self.value.strip().lower()
        if not normalized:
            raise ValueError("Slug cannot be empty")
        # ASCII only. `str.isalnum()` is Unicode-aware and would happily accept
        # "prompting-básico", which a browser then percent-encodes into
        # "prompting-b%C3%A1sico" — unreadable, and unreadable is the opposite of
        # what a shareable link is for.
        if not _SLUG_PATTERN.fullmatch(normalized):
            raise ValueError("Slug may only contain ASCII letters, digits and hyphens")
        object.__setattr__(self, "value", normalized)

    def __str__(self) -> str:
        return self.value


@dataclass
class Lesson:
    id: UUID
    title: str
    kind: LessonKind
    position: int
    duration_seconds: int = 0
    # Content is deliberately absent from the public syllabus. The catalog shows
    # what a course covers (PRD E-02); reading the material is what enrollment
    # is for, so these stay empty on the catalog endpoints.
    body: str = ""
    resource_ref: str | None = None
    # Set on the catalog path, where `resource_ref` deliberately is not.
    has_media: bool = False


@dataclass
class Module:
    id: UUID
    title: str
    position: int
    lessons: list[Lesson] = field(default_factory=list)

    @property
    def ordered_lessons(self) -> list[Lesson]:
        return sorted(self.lessons, key=lambda lesson: lesson.position)

    @property
    def duration_seconds(self) -> int:
        return sum(lesson.duration_seconds for lesson in self.lessons)


@dataclass
class Course:
    """A course with its full syllabus.

    This is the detail aggregate. Listing the catalog uses `CourseSummary`
    instead, because loading every lesson of every course to render a grid of
    cards is how a catalog page becomes slow.
    """

    id: UUID
    slug: Slug
    title: str
    summary: str
    description: str
    level: Level
    status: CourseStatus
    instructor_id: UUID
    instructor_name: str
    created_at: datetime | None = None
    published_at: datetime | None = None
    modules: list[Module] = field(default_factory=list)

    @property
    def is_visible_in_catalog(self) -> bool:
        return self.status is CourseStatus.PUBLISHED

    @property
    def ordered_modules(self) -> list[Module]:
        return sorted(self.modules, key=lambda module: module.position)

    @property
    def lesson_count(self) -> int:
        return sum(len(module.lessons) for module in self.modules)

    @property
    def duration_seconds(self) -> int:
        """Derived, never stored.

        A denormalized duration column drifts the first time someone edits a
        lesson and forgets to recalculate it, and a catalog that lies about how
        long a course takes loses the teacher on day one.
        """
        return sum(module.duration_seconds for module in self.modules)

    def as_summary(self) -> "CourseSummary":
        """Narrow this course down to what a card renders."""
        return CourseSummary(
            id=self.id,
            slug=self.slug,
            title=self.title,
            summary=self.summary,
            level=self.level,
            instructor_name=self.instructor_name,
            lesson_count=self.lesson_count,
            duration_seconds=self.duration_seconds,
            published_at=self.published_at,
        )


@dataclass(frozen=True)
class CourseSummary:
    """The list projection: what a catalog card needs and nothing more."""

    id: UUID
    slug: Slug
    title: str
    summary: str
    level: Level
    instructor_name: str
    lesson_count: int
    duration_seconds: int
    published_at: datetime | None = None


@dataclass(frozen=True)
class CatalogFilters:
    level: Level | None = None
    # Free-text search over title and summary. Deliberately not over the full
    # description: matching a word buried in paragraph nine produces results a
    # teacher cannot explain to themselves.
    query: str | None = None


@dataclass(frozen=True)
class Page:
    """One page of results plus the cursor to continue.

    Cursor pagination rather than offset (TRD 8): with offset, a course
    published while a teacher scrolls shifts every later row and they silently
    see a duplicate or miss one entirely.
    """

    items: list[CourseSummary]
    next_cursor: str | None = None

    @property
    def has_more(self) -> bool:
        return self.next_cursor is not None
