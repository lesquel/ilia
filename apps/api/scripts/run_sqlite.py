"""Prepare ILIA's persistent local SQLite catalog and optionally serve the API.

This is a development convenience only. Production and normal deployments keep
using PostgreSQL and Alembic; the local file is created from ORM metadata.

    uv run python -m scripts.run_sqlite --seed-only
    uv run python -m scripts.run_sqlite
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import URL

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.admin.infrastructure import models as admin_models  # noqa: F401
from app.features.auth.infrastructure import models as auth_models  # noqa: F401
from app.features.billing.infrastructure import models as billing_models  # noqa: F401
from app.features.catalog.infrastructure import models as catalog_models  # noqa: F401
from app.features.certificates.infrastructure import models as certificate_models  # noqa: F401
from app.features.enrollment.infrastructure import models as enrollment_models  # noqa: F401
from app.features.evaluation.infrastructure import models as evaluation_models  # noqa: F401
from app.features.forum.infrastructure import models as forum_models  # noqa: F401
from scripts.seed_catalog import ensure_catalog_owner, publish_catalog

API_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_PATH = API_ROOT / "ilia-local.sqlite3"


def local_settings() -> Settings:
    database_path = Path(os.environ.get("ILIA_LOCAL_SQLITE_PATH", DEFAULT_DATABASE_PATH))
    database_path.parent.mkdir(parents=True, exist_ok=True)
    database_url = URL.create("sqlite+aiosqlite", database=str(database_path))
    media_path = API_ROOT / "media"
    return Settings(
        environment="local",
        debug=False,
        database_url=database_url.render_as_string(hide_password=False),
        jwt_secret="ilia-local-sqlite-development-only-key",
        cookie_secure=False,
        cors_origins=["http://localhost:8081", "http://localhost:19006"],
        storage_provider="local",
        storage_local_dir=str(media_path),
        storage_local_base_url="http://localhost:8000/media",
    )


async def prepare_catalog(settings: Settings) -> None:
    database = Database(settings)
    try:
        async with database.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        instructor = await ensure_catalog_owner(database)
        count = await publish_catalog(database, instructor)
    finally:
        await database.dispose()
    print(f"Base SQLite lista: {settings.database_url}")
    print(f"Cursos cargados: {count}; catálogo: http://localhost:8000/api/v1/catalog/courses")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--seed-only",
        action="store_true",
        help="crear/actualizar el catálogo local y salir, sin iniciar la API",
    )
    args = parser.parse_args()
    settings = local_settings()
    asyncio.run(prepare_catalog(settings))
    if args.seed_only:
        return

    os.environ["ILIA_ENVIRONMENT"] = settings.environment
    os.environ["ILIA_DEBUG"] = "false"
    os.environ["ILIA_DATABASE_URL"] = str(settings.database_url)
    os.environ["ILIA_JWT_SECRET"] = settings.jwt_secret
    os.environ["ILIA_COOKIE_SECURE"] = "false"
    os.environ["ILIA_CORS_ORIGINS"] = json.dumps(settings.cors_origins)
    os.environ["ILIA_STORAGE_PROVIDER"] = "local"
    os.environ["ILIA_STORAGE_LOCAL_DIR"] = settings.storage_local_dir
    os.environ["ILIA_STORAGE_LOCAL_BASE_URL"] = settings.storage_local_base_url
    from app.core.config import get_settings

    get_settings.cache_clear()

    import uvicorn

    from app.main import app

    uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
