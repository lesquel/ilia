from typing import Protocol

from app.features.catalog.domain.entities import (
    CatalogFilters,
    Course,
    Page,
    Slug,
)


class CourseRepository(Protocol):
    async def list_published(
        self,
        *,
        filters: CatalogFilters,
        limit: int,
        cursor: str | None = None,
    ) -> Page:
        """Published courses only.

        The restriction is the repository's job, not the caller's. A draft
        course leaking into the catalog because one endpoint forgot a `WHERE` is
        exactly the kind of bug that shows up in a demo.
        """
        ...

    async def get_published_by_slug(self, slug: Slug) -> Course | None:
        """A published course with its full syllabus, or None."""
        ...
