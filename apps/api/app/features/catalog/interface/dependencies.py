import structlog

from app.core.config import Settings
from app.core.database import Database
from app.features.catalog.domain.ports import CourseRepository
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.catalog.infrastructure.sql_repository import SqlAlchemyCourseRepository


def build_catalog_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    courses: CourseRepository

    if database is not None:
        courses = SqlAlchemyCourseRepository(database)
    else:
        structlog.get_logger().warning(
            "catalog_using_in_memory_repository",
            detail="ILIA_DATABASE_URL is not set; the catalog will be empty",
        )
        courses = InMemoryCourseRepository()

    return {"courses": courses}
