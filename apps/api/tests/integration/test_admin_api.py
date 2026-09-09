"""Admin endpoints against a real PostgreSQL.

The rules defended here: only admins get in, role changes are audited, and the
platform can never be left without an administrator.
"""

import asyncio
import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import Base, Database
from app.features.auth.domain.entities import Role
from app.main import create_app

TEST_DATABASE_URL = os.getenv("ILIA_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="ILIA_TEST_DATABASE_URL is not set (run `docker compose up -d` first)",
)

NATIVE = {"X-Client-Platform": "native"}
API = "/api/v1/admin"

TABLES = (
    "audit_log, lesson_progress, enrollment, certificate, forum_post, forum_thread, "
    "evaluation_score, evaluation, model_output, llm_usage, submission, activity, "
    "rubric_dimension, rubric, lesson, course_module, course, app_user, cohort"
)


async def _run_sql(statements: list[str], create_schema: bool = False) -> None:
    db = Database(Settings(database_url=TEST_DATABASE_URL, jwt_secret="x" * 32))
    try:
        async with db.engine.begin() as connection:
            if create_schema:
                await connection.run_sync(Base.metadata.create_all)
            for statement in statements:
                await connection.execute(text(statement))
    finally:
        await db.dispose()


def sql(statements: list[str], create_schema: bool = False) -> None:
    """Setup in its own event loop — see `test_instructor_api` for why."""
    asyncio.run(_run_sql(statements, create_schema=create_schema))


@pytest.fixture
def client() -> Iterator[TestClient]:
    sql([f"TRUNCATE {TABLES} CASCADE"], create_schema=True)

    settings = Settings(
        environment="local",
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-long-enough-for-hmac-sha256",
        cookie_secure=False,
    )

    with TestClient(create_app(settings)) as test_client:
        yield test_client

    sql([f"TRUNCATE {TABLES} CASCADE"])


def register(client: TestClient, email: str, name: str = "Ana Pérez") -> dict:  # type: ignore[type-arg]
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": name, "password": "una-clave-larga"},
        headers=NATIVE,
    ).json()


def auth(token: str) -> dict[str, str]:
    return {**NATIVE, "Authorization": f"Bearer {token}"}


def promote(email: str, role: Role) -> None:
    sql([f"UPDATE app_user SET role = '{role.value}' WHERE email = '{email}'"])


@pytest.fixture
def admin(client: TestClient) -> str:
    body = register(client, "admin@ilia.app", "Ana Admin")
    promote("admin@ilia.app", Role.ADMIN)
    return body["access_token"]


class TestRoleGate:
    def test_a_student_is_refused(self, client: TestClient) -> None:
        token = register(client, "ana@colegio.edu")["access_token"]

        assert client.get(f"{API}/overview", headers=auth(token)).status_code == 403

    def test_an_instructor_is_also_refused(self, client: TestClient) -> None:
        # Permissions accumulate upward, but admin is the top: an instructor is
        # not one.
        token = register(client, "eduardo@manta.gob.ec", "Eduardo")["access_token"]
        promote("eduardo@manta.gob.ec", Role.INSTRUCTOR)

        assert client.get(f"{API}/overview", headers=auth(token)).status_code == 403

    def test_an_admin_gets_in(self, client: TestClient, admin: str) -> None:
        assert client.get(f"{API}/overview", headers=auth(admin)).status_code == 200


class TestOverview:
    def test_it_counts_the_platform(self, client: TestClient, admin: str) -> None:
        register(client, "ana@colegio.edu")
        register(client, "luis@colegio.edu", "Luis")

        body = client.get(f"{API}/overview", headers=auth(admin)).json()

        assert body["students"] == 2
        assert body["admins"] == 1
        assert body["total_users"] == 3


class TestUsers:
    def test_it_lists_everyone(self, client: TestClient, admin: str) -> None:
        register(client, "ana@colegio.edu")

        users = client.get(f"{API}/users", headers=auth(admin)).json()

        assert {item["email"] for item in users} == {"admin@ilia.app", "ana@colegio.edu"}

    def test_it_can_be_searched_by_name_or_email(self, client: TestClient, admin: str) -> None:
        register(client, "ana@colegio.edu", "Ana Pérez")
        register(client, "luis@colegio.edu", "Luis Zambrano")

        found = client.get(f"{API}/users", params={"q": "zambrano"}, headers=auth(admin)).json()

        assert [item["email"] for item in found] == ["luis@colegio.edu"]


class TestRoleChange:
    def test_an_admin_can_promote_a_teacher_to_instructor(
        self, client: TestClient, admin: str
    ) -> None:
        # There is no self-service path to this role anywhere: it is granted,
        # never claimed (PRD A-02).
        user = register(client, "eduardo@manta.gob.ec", "Eduardo")

        response = client.post(
            f"{API}/users/{user['user']['id']}/role",
            json={"role": "instructor"},
            headers=auth(admin),
        )

        assert response.status_code == 200
        assert response.json()["role"] == "instructor"

    def test_the_change_takes_effect_immediately(self, client: TestClient, admin: str) -> None:
        user = register(client, "eduardo@manta.gob.ec", "Eduardo")
        token = user["access_token"]
        assert client.get("/api/v1/instructor/courses", headers=auth(token)).status_code == 403

        client.post(
            f"{API}/users/{user['user']['id']}/role",
            json={"role": "instructor"},
            headers=auth(admin),
        )

        assert client.get("/api/v1/instructor/courses", headers=auth(token)).status_code == 200

    def test_it_is_written_to_the_audit_log(self, client: TestClient, admin: str) -> None:
        user = register(client, "eduardo@manta.gob.ec", "Eduardo")

        client.post(
            f"{API}/users/{user['user']['id']}/role",
            json={"role": "instructor"},
            headers=auth(admin),
        )

        entries = client.get(f"{API}/audit", headers=auth(admin)).json()

        assert len(entries) == 1
        assert entries[0]["action"] == "role_changed"
        assert entries[0]["actor_name"] == "Ana Admin"
        assert entries[0]["detail"]["from"] == "student"
        assert entries[0]["detail"]["to"] == "instructor"

    def test_an_admin_cannot_change_their_own_role(self, client: TestClient, admin: str) -> None:
        # The alternative is a platform with nobody able to grant it back.
        me = client.get("/api/v1/auth/me", headers=auth(admin)).json()

        response = client.post(
            f"{API}/users/{me['id']}/role", json={"role": "student"}, headers=auth(admin)
        )

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "cannot_demote_yourself"

    def test_the_last_admin_cannot_be_demoted_by_another_admin(
        self, client: TestClient, admin: str
    ) -> None:
        second = register(client, "admin2@ilia.app", "Segundo Admin")
        client.post(
            f"{API}/users/{second['user']['id']}/role",
            json={"role": "admin"},
            headers=auth(admin),
        )
        me = client.get("/api/v1/auth/me", headers=auth(admin)).json()

        # Two admins: demoting one is fine.
        first = client.post(
            f"{API}/users/{me['id']}/role",
            json={"role": "student"},
            headers=auth(second["access_token"]),
        )
        assert first.status_code == 200

        # One admin left: demoting them locks everyone out of this screen.
        response = client.post(
            f"{API}/users/{second['user']['id']}/role",
            json={"role": "student"},
            headers=auth(second["access_token"]),
        )
        assert response.status_code == 409

    def test_an_unknown_user_is_not_found(self, client: TestClient, admin: str) -> None:
        response = client.post(
            f"{API}/users/11111111-1111-1111-1111-111111111111/role",
            json={"role": "student"},
            headers=auth(admin),
        )

        assert response.status_code == 404


class TestUsageReport:
    def test_it_reports_zero_and_says_prices_are_not_configured(
        self, client: TestClient, admin: str
    ) -> None:
        # A zero that means "not configured" must never read as "free".
        body = client.get(f"{API}/usage", headers=auth(admin)).json()

        assert body["totals"]["total_tokens"] == 0
        assert body["totals"]["prices_configured"] is False

    def test_the_period_defaults_to_the_last_thirty_days(
        self, client: TestClient, admin: str
    ) -> None:
        body = client.get(f"{API}/usage", headers=auth(admin)).json()

        assert body["period_days"] == 30
