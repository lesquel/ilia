"""PostgreSQL implementation of the catalog port."""

from uuid import UUID

from sqlalchemy import Select, Subquery, and_, func, literal, or_, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import Database
from app.features.auth.infrastructure.models import UserModel
from app.features.catalog.domain.entities import (
    CatalogFilters,
    Course,
    CourseStatus,
    CourseSummary,
    Lesson,
    LessonKind,
    Level,
    Module,
    ModuleActivity,
    Page,
    Slug,
)
from app.features.evaluation.infrastructure.models import ActivityModel

from .cursor import decode_cursor, encode_cursor
from .models import CourseModel, LessonModel, ModuleModel

# Published courses are ordered by when they went live. `created_at` is the
# fallback so a row with a missing `published_at` still sorts deterministically
# instead of dropping out of the keyset comparison entirely.
_SORT_KEY = func.coalesce(CourseModel.published_at, CourseModel.created_at)


def _lesson_aggregate() -> Subquery:
    """Lesson count and total duration per course, in one pass.

    A subquery rather than loading every lesson: rendering a grid of catalog
    cards must not read the whole syllabus of every course on the page.
    """
    return (
        select(
            ModuleModel.course_id.label("course_id"),
            func.count(LessonModel.id).label("lesson_count"),
            func.coalesce(func.sum(LessonModel.duration_seconds), 0).label("duration_seconds"),
        )
        .select_from(ModuleModel)
        .outerjoin(LessonModel, LessonModel.module_id == ModuleModel.id)
        .group_by(ModuleModel.course_id)
        .subquery()
    )


class SqlAlchemyCourseRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def list_published(
        self,
        *,
        filters: CatalogFilters,
        limit: int,
        cursor: str | None = None,
    ) -> Page:
        aggregate = _lesson_aggregate()

        statement = (
            select(
                CourseModel,
                UserModel.full_name,
                func.coalesce(aggregate.c.lesson_count, 0),
                func.coalesce(aggregate.c.duration_seconds, 0),
                _SORT_KEY.label("sort_key"),
            )
            .join(UserModel, UserModel.id == CourseModel.instructor_id)
            .outerjoin(aggregate, aggregate.c.course_id == CourseModel.id)
            .where(CourseModel.status == CourseStatus.PUBLISHED.value)
        )

        if filters.level is not None:
            statement = statement.where(CourseModel.level == filters.level.value)

        if filters.query:
            pattern = f"%{filters.query}%"
            statement = statement.where(
                or_(CourseModel.title.ilike(pattern), CourseModel.summary.ilike(pattern))
            )

        if cursor:
            last_sort_key, last_id = decode_cursor(cursor)
            if last_sort_key is not None:
                # Row comparison, not `sort_key < x OR (sort_key = x AND id < y)`.
                # Same meaning, one index scan, and no chance of getting the
                # tie-break wrong when two courses publish in the same second.
                statement = statement.where(
                    tuple_(_SORT_KEY, CourseModel.id)
                    < tuple_(literal(last_sort_key), literal(last_id))
                )

        statement = statement.order_by(_SORT_KEY.desc(), CourseModel.id.desc())
        # One extra row is how we learn there is a next page without a second
        # COUNT query over the whole table.
        statement = statement.limit(limit + 1)

        async with self._db.session() as session:
            rows = (await session.execute(statement)).all()

        has_more = len(rows) > limit
        visible = rows[:limit]

        items = [
            CourseSummary(
                id=course.id,
                slug=Slug(course.slug),
                title=course.title,
                summary=course.summary,
                level=Level(course.level),
                instructor_name=instructor_name,
                lesson_count=lesson_count,
                duration_seconds=duration_seconds,
                published_at=course.published_at,
            )
            for course, instructor_name, lesson_count, duration_seconds, _ in visible
        ]

        next_cursor = None
        if has_more and visible:
            last_course, _, _, _, last_sort_key = visible[-1]
            next_cursor = encode_cursor(last_sort_key, last_course.id)

        return Page(items=items, next_cursor=next_cursor)

    async def get_by_id(self, course_id: UUID) -> Course | None:
        courses = await self.get_many_by_ids([course_id])
        return courses.get(course_id)

    async def get_many_by_ids(self, course_ids: list[UUID]) -> dict[UUID, Course]:
        if not course_ids:
            return {}

        statement = _with_syllabus(
            select(CourseModel, UserModel.full_name)
            .join(UserModel, UserModel.id == CourseModel.instructor_id)
            .where(CourseModel.id.in_(course_ids))
        )

        # One session for the courses and their activities: against a remote
        # database every extra session is a pre-ping, a BEGIN and a COMMIT.
        async with self._db.session() as session:
            rows = (await session.execute(statement)).unique().all()
            activities = await _activities_of(session, [course for course, _ in rows])

        return {
            course.id: _to_entity(course, instructor_name, activities)
            for course, instructor_name in rows
        }

    async def get_published_by_slug(self, slug: Slug) -> Course | None:
        statement = _with_syllabus(
            select(CourseModel, UserModel.full_name)
            .join(UserModel, UserModel.id == CourseModel.instructor_id)
            .where(
                and_(
                    CourseModel.slug == slug.value,
                    CourseModel.status == CourseStatus.PUBLISHED.value,
                )
            )
        )

        async with self._db.session() as session:
            row = (await session.execute(statement)).unique().first()
            if row is None:
                return None
            course, instructor_name = row
            activities = await _activities_of(session, [course])

        return _to_entity(course, instructor_name, activities)


def _with_syllabus(statement: Select) -> Select:  # type: ignore[type-arg]
    """Load modules and lessons in the same statement as the course.

    A join rather than `selectinload`: two fewer round trips per course, which
    is most of what a request costs against a remote database. The relationship
    `order_by` keeps modules and lessons in syllabus order. `body` is deferred
    because the catalog never serves the material, only the syllabus.
    """
    return statement.options(
        joinedload(CourseModel.modules).joinedload(ModuleModel.lessons).defer(LessonModel.body)
    )


async def _activities_of(
    session: AsyncSession, courses: list[CourseModel]
) -> dict[UUID, list[ModuleActivity]]:
    """The lab activities of some courses, grouped by module.

    A separate query rather than a relationship: activities belong to the
    evaluation feature's tables, and wiring the two ORM models together
    would tie the catalog's schema to another feature's.
    """
    module_ids = [module.id for course in courses for module in course.modules]
    if not module_ids:
        return {}

    rows = (
        await session.execute(
            select(
                ActivityModel.module_id,
                ActivityModel.id,
                ActivityModel.title,
                ActivityModel.max_attempts,
            )
            .where(ActivityModel.module_id.in_(module_ids))
            .order_by(ActivityModel.title)
        )
    ).all()

    grouped: dict[UUID, list[ModuleActivity]] = {}
    for module_id, activity_id, title, max_attempts in rows:
        grouped.setdefault(module_id, []).append(
            ModuleActivity(id=activity_id, title=title, max_attempts=max_attempts)
        )
    return grouped


def _to_entity(
    row: CourseModel,
    instructor_name: str,
    activities: dict[UUID, list[ModuleActivity]] | None = None,
) -> Course:
    activities = activities or {}
    return Course(
        id=row.id,
        slug=Slug(row.slug),
        title=row.title,
        summary=row.summary,
        description=row.description,
        level=Level(row.level),
        status=CourseStatus(row.status),
        instructor_id=row.instructor_id,
        instructor_name=instructor_name,
        created_at=row.created_at,
        published_at=row.published_at,
        modules=[
            Module(
                id=module.id,
                title=module.title,
                position=module.position,
                lessons=[
                    # `body` and `resource_ref` are deliberately left empty.
                    # The catalog serves the syllabus, not the material: content
                    # is read through the enrollment feature, which checks the
                    # teacher actually joined the course first.
                    Lesson(
                        id=lesson.id,
                        title=lesson.title,
                        kind=LessonKind(lesson.kind),
                        position=lesson.position,
                        duration_seconds=lesson.duration_seconds,
                        # Whether there is material, never where it lives. The
                        # key is a storage path and stays out of a public
                        # response; a boolean tells a reader which lessons have
                        # a video without handing anyone the object.
                        has_media=lesson.resource_ref is not None,
                    )
                    for lesson in module.lessons
                ],
                activities=activities.get(module.id, []),
            )
            for module in row.modules
        ],
    )
