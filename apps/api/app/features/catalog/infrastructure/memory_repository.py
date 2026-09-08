"""In-memory catalog repository.

Two jobs: it keeps the API tests fast, and it lets the app boot with no database
for a quick look around. Like its auth counterpart, it is not for production.

It reimplements the same ordering and keyset rules as the SQL version on
purpose. If the two ever disagree, the integration suite is what catches it —
which is why those tests run against a real PostgreSQL and not against this.
"""

from app.features.catalog.domain.entities import (
    CatalogFilters,
    Course,
    CourseStatus,
    CourseSummary,
    Page,
    Slug,
)

from .cursor import decode_cursor, encode_cursor


class InMemoryCourseRepository:
    def __init__(self, courses: list[Course] | None = None) -> None:
        self._courses = list(courses or [])

    async def list_published(
        self,
        *,
        filters: CatalogFilters,
        limit: int,
        cursor: str | None = None,
    ) -> Page:
        matching = [course for course in self._courses if course.is_visible_in_catalog]

        if filters.level is not None:
            matching = [course for course in matching if course.level is filters.level]

        if filters.query:
            needle = filters.query.lower()
            matching = [
                course
                for course in matching
                if needle in course.title.lower() or needle in course.summary.lower()
            ]

        matching.sort(key=self._sort_key, reverse=True)

        if cursor:
            last_sort_key, last_id = decode_cursor(cursor)
            if last_sort_key is not None:
                matching = [
                    course
                    for course in matching
                    if self._sort_key(course) < (last_sort_key.timestamp(), str(last_id))
                ]

        visible = matching[:limit]
        has_more = len(matching) > limit

        items = [
            CourseSummary(
                id=course.id,
                slug=course.slug,
                title=course.title,
                summary=course.summary,
                level=course.level,
                instructor_name=course.instructor_name,
                lesson_count=course.lesson_count,
                duration_seconds=course.duration_seconds,
                published_at=course.published_at,
            )
            for course in visible
        ]

        next_cursor = None
        if has_more and visible:
            last = visible[-1]
            next_cursor = encode_cursor(last.published_at or last.created_at, last.id)

        return Page(items=items, next_cursor=next_cursor)

    async def get_published_by_slug(self, slug: Slug) -> Course | None:
        for course in self._courses:
            if course.slug == slug and course.status is CourseStatus.PUBLISHED:
                return course
        return None

    @staticmethod
    def _sort_key(course: Course) -> tuple[float, str]:
        moment = course.published_at or course.created_at
        return (moment.timestamp() if moment else 0.0, str(course.id))
