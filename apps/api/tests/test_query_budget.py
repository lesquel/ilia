"""How many round trips the learner's hottest endpoints cost.

Against a remote database every statement and every pooled session pays a
network round trip (a session also pays the pre-ping, BEGIN and COMMIT), so the
cost of a request is set by how many of them run one after another, not by how
heavy each one is. These ceilings pin that number so it cannot creep back up:
an N+1 or a repository loading the same course twice fails here first.

The counts come from a real SQLite database seeded with the real catalog,
through the same SQLAlchemy repositories production uses.
"""

import asyncio
import re
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import URL, event

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
from app.main import create_app
from scripts.seed_catalog import ensure_catalog_owner, publish_catalog

NATIVE = {"X-Client-Platform": "native"}
FIRST = "introduccion-ia-docentes"
SECOND = "ia-para-docentes"


@dataclass
class Meter:
    statements: list[str] = field(default_factory=list)
    checkouts: int = 0

    def reset(self) -> None:
        self.statements.clear()
        self.checkouts = 0


@dataclass
class Harness:
    client: TestClient
    meter: Meter
    headers: dict[str, str]

    @contextmanager
    def measure(self) -> Iterator[Meter]:
        self.meter.reset()
        yield self.meter


@pytest.fixture
def harness(tmp_path) -> Iterator[Harness]:  # type: ignore[no-untyped-def]
    database_url = URL.create(
        "sqlite+aiosqlite", database=str(tmp_path / "budget.sqlite3")
    ).render_as_string(hide_password=False)
    settings = Settings(
        environment="local",
        database_url=database_url,
        jwt_secret="query-budget-test-key-that-is-long-enough",
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

    asyncio.run(prepare())

    app = create_app(settings)
    meter = Meter()
    engine = app.state.database.engine.sync_engine

    def on_statement(_conn, _cursor, statement, *_args) -> None:  # type: ignore[no-untyped-def]
        meter.statements.append(" ".join(statement.split()))

    def on_checkout(*_args) -> None:  # type: ignore[no-untyped-def]
        meter.checkouts += 1

    event.listen(engine, "before_cursor_execute", on_statement)
    event.listen(engine.pool, "checkout", on_checkout)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "budget@colegio.edu",
                "full_name": "Ana Pérez",
                "password": "Una-clave-larga1!",
            },
            headers=NATIVE,
        )
        assert response.status_code == 201, response.text
        headers = {**NATIVE, "Authorization": f"Bearer {response.json()['access_token']}"}
        yield Harness(client=client, meter=meter, headers=headers)


def _enroll(harness: Harness, slug: str) -> None:
    response = harness.client.post(
        "/api/v1/enrollments", json={"course_slug": slug}, headers=harness.headers
    )
    assert response.status_code == 201, response.text


# The course table itself, schema-qualified or not; not course_module.
_COURSE_TABLE = re.compile(r"FROM (\w+\.)?course(\s|$)")
_USER_TABLE = re.compile(r"FROM (\w+\.)?app_user(\s|$)")


def _explain(meter: Meter) -> str:
    return f"{meter.checkouts} sessions, statements:\n" + "\n".join(
        s[:120] for s in meter.statements
    )


def test_enrolling_loads_the_course_once(harness: Harness) -> None:
    with harness.measure() as meter:
        _enroll(harness, FIRST)

    course_loads = [s for s in meter.statements if _COURSE_TABLE.search(s)]
    assert len(course_loads) == 1, _explain(meter)
    # The plan gate shares the request's signed-in user, so the user is read once.
    user_loads = [s for s in meter.statements if _USER_TABLE.search(s)]
    assert len(user_loads) == 1, _explain(meter)
    assert len(meter.statements) <= 9, _explain(meter)
    assert meter.checkouts <= 7, _explain(meter)


def test_my_courses_costs_the_same_for_one_course_or_two(harness: Harness) -> None:
    _enroll(harness, FIRST)
    with harness.measure() as meter:
        response = harness.client.get("/api/v1/enrollments/me", headers=harness.headers)
    assert response.status_code == 200
    one_course = (len(meter.statements), meter.checkouts)

    _enroll(harness, SECOND)
    with harness.measure() as meter:
        response = harness.client.get("/api/v1/enrollments/me", headers=harness.headers)
    assert response.status_code == 200
    assert len(response.json()) == 2
    two_courses = (len(meter.statements), meter.checkouts)

    assert two_courses == one_course, _explain(meter)
    assert len(meter.statements) <= 6, _explain(meter)
    assert meter.checkouts <= 4, _explain(meter)


def test_course_progress_stays_within_budget(harness: Harness) -> None:
    _enroll(harness, FIRST)
    with harness.measure() as meter:
        response = harness.client.get(f"/api/v1/enrollments/me/{FIRST}", headers=harness.headers)

    assert response.status_code == 200
    assert len(meter.statements) <= 6, _explain(meter)
    assert meter.checkouts <= 4, _explain(meter)


def test_course_detail_is_one_session(harness: Harness) -> None:
    with harness.measure() as meter:
        response = harness.client.get(f"/api/v1/catalog/courses/{FIRST}")

    assert response.status_code == 200
    assert len(response.json()["modules"]) == 4
    assert len(meter.statements) <= 2, _explain(meter)
    assert meter.checkouts <= 1, _explain(meter)
