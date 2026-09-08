"""Catalog endpoints.

**Public on purpose.** A teacher has to be able to see what a course covers
before committing to it (PRD E-02), and requiring an account to read the
syllabus is exactly the friction §2.2 warns about.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.features.catalog.application.use_cases import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    BrowseCatalog,
    GetCourseDetail,
)
from app.features.catalog.domain.entities import Level
from app.features.catalog.domain.ports import CourseRepository
from app.features.catalog.interface.schemas import CourseDetailResponse, CoursePageResponse

router = APIRouter(prefix="/catalog", tags=["catalog"])


def get_course_repository(request: Request) -> CourseRepository:
    return request.app.state.catalog["courses"]  # type: ignore[no-any-return]


CoursesDep = Annotated[CourseRepository, Depends(get_course_repository)]


@router.get("/courses", response_model=CoursePageResponse)
async def browse_courses(
    courses: CoursesDep,
    level: Level | None = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    cursor: str | None = None,
) -> CoursePageResponse:
    page = await BrowseCatalog(courses=courses).execute(
        level=level, query=q, limit=limit, cursor=cursor
    )
    return CoursePageResponse.from_page(page)


@router.get("/courses/{slug}", response_model=CourseDetailResponse)
async def course_detail(slug: str, courses: CoursesDep) -> CourseDetailResponse:
    course = await GetCourseDetail(courses=courses).execute(slug=slug)
    return CourseDetailResponse.from_course(course)
