from typing import Protocol
from uuid import UUID

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

    async def get_by_id(self, course_id: UUID) -> Course | None:
        """Any course by id, **regardless of status**.

        Narrow on purpose: it exists for callers who already hold a reason to
        see the course — an enrollment. A teacher who joined a course keeps it
        in their panel after it is withdrawn from the catalog (PRD A-04), so the
        published-only filter would be wrong here. Never serve the public
        catalog from this method.
        """
        ...
