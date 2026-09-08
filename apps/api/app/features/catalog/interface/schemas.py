from uuid import UUID

from pydantic import BaseModel

from app.features.catalog.domain.entities import Course, CourseSummary, Module, Page


class LessonResponse(BaseModel):
    id: UUID
    title: str
    kind: str
    position: int
    duration_seconds: int


class ModuleResponse(BaseModel):
    id: UUID
    title: str
    position: int
    lessons: list[LessonResponse]

    @classmethod
    def from_entity(cls, module: Module) -> "ModuleResponse":
        return cls(
            id=module.id,
            title=module.title,
            position=module.position,
            lessons=[
                LessonResponse(
                    id=lesson.id,
                    title=lesson.title,
                    kind=lesson.kind.value,
                    position=lesson.position,
                    duration_seconds=lesson.duration_seconds,
                )
                # Ordering is the domain's answer, not the database's. The query
                # already sorts, but the rule belongs where it can be tested.
                for lesson in module.ordered_lessons
            ],
        )


class CourseSummaryResponse(BaseModel):
    id: UUID
    slug: str
    title: str
    summary: str
    level: str
    instructor_name: str
    lesson_count: int
    duration_seconds: int

    @classmethod
    def from_entity(cls, course: CourseSummary) -> "CourseSummaryResponse":
        return cls(
            id=course.id,
            slug=str(course.slug),
            title=course.title,
            summary=course.summary,
            level=course.level.value,
            instructor_name=course.instructor_name,
            lesson_count=course.lesson_count,
            duration_seconds=course.duration_seconds,
        )


class CourseDetailResponse(CourseSummaryResponse):
    description: str
    modules: list[ModuleResponse]

    @classmethod
    def from_course(cls, course: Course) -> "CourseDetailResponse":
        return cls(
            id=course.id,
            slug=str(course.slug),
            title=course.title,
            summary=course.summary,
            description=course.description,
            level=course.level.value,
            instructor_name=course.instructor_name,
            lesson_count=course.lesson_count,
            duration_seconds=course.duration_seconds,
            modules=[ModuleResponse.from_entity(module) for module in course.ordered_modules],
        )


class CoursePageResponse(BaseModel):
    """A page plus the cursor for the next one.

    `next_cursor` is null on the last page. The client asks for more only while
    it is present, so it never needs a total count — and the catalog never pays
    for one.
    """

    items: list[CourseSummaryResponse]
    next_cursor: str | None

    @classmethod
    def from_page(cls, page: Page) -> "CoursePageResponse":
        return cls(
            items=[CourseSummaryResponse.from_entity(course) for course in page.items],
            next_cursor=page.next_cursor,
        )
