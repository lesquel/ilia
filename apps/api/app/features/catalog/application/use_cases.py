"""Catalog use cases."""

from app.features.catalog.domain.entities import CatalogFilters, Course, Level, Page, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.domain.ports import CourseRepository

DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 50


class BrowseCatalog:
    def __init__(self, *, courses: CourseRepository) -> None:
        self._courses = courses

    async def execute(
        self,
        *,
        level: Level | None = None,
        query: str | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
        cursor: str | None = None,
    ) -> Page:
        # Clamp rather than reject. A client asking for 10 000 courses is a bug
        # or an abuse; either way the catalog should keep working, and an
        # unbounded page is a way to make the database do unbounded work.
        page_size = max(1, min(limit, MAX_PAGE_SIZE))

        cleaned = query.strip() if query else None

        return await self._courses.list_published(
            filters=CatalogFilters(level=level, query=cleaned or None),
            limit=page_size,
            cursor=cursor,
        )


class GetCourseDetail:
    def __init__(self, *, courses: CourseRepository) -> None:
        self._courses = courses

    async def execute(self, *, slug: str) -> Course:
        try:
            identifier = Slug(slug)
        except ValueError as exc:
            # A malformed slug cannot match anything, so it is a miss and not a
            # validation error. Same answer as an unpublished course, which also
            # keeps draft slugs from being discoverable by probing.
            raise CourseNotFoundError(slug) from exc

        course = await self._courses.get_published_by_slug(identifier)
        if course is None:
            raise CourseNotFoundError(slug)

        return course
