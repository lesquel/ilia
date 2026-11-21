from fastapi.testclient import TestClient
from sqlalchemy import URL

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.infrastructure import models as auth_models  # noqa: F401
from app.features.catalog.infrastructure import models as catalog_models  # noqa: F401
from app.features.evaluation.infrastructure import models as evaluation_models  # noqa: F401
from app.main import create_app
from scripts.seed_catalog import ensure_catalog_owner, publish_catalog


def test_sqlite_can_seed_and_serve_the_intro_course(tmp_path) -> None:
    database_url = URL.create(
        "sqlite+aiosqlite",
        database=str(tmp_path / "ilia.sqlite3"),
    ).render_as_string(hide_password=False)
    settings = Settings(
        environment="local",
        database_url=database_url,
        jwt_secret="local-sqlite-test-key-that-is-long-enough",
        cookie_secure=False,
        storage_provider="local",
        storage_local_dir=str(tmp_path / "media"),
    )

    async def prepare() -> None:
        database = Database(settings)
        async with database.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        instructor = await ensure_catalog_owner(database)
        await publish_catalog(database, instructor)
        await database.dispose()

    import asyncio

    asyncio.run(prepare())

    with TestClient(create_app(settings)) as client:
        response = client.get("/api/v1/catalog/courses/introduccion-ia-docentes")

    assert response.status_code == 200
    course = response.json()
    assert len(course["modules"]) == 4
    lessons = [lesson for module in course["modules"] for lesson in module["lessons"]]
    assert sum(lesson["kind"] == "quiz" for lesson in lessons) == 4
    assert sum(lesson["has_media"] for lesson in lessons) == 4
