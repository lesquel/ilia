"""Instructor endpoints against a real PostgreSQL.

Authoring writes to tables, so these run against the database rather than a
fake. The rule they exist to defend: an instructor edits their own courses and
nobody else's.
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
API = "/api/v1/instructor"

TABLES = (
    "lesson_progress, enrollment, certificate, forum_post, forum_thread, "
    "evaluation_score, evaluation, model_output, llm_usage, submission, activity, "
    "rubric_dimension, rubric, lesson, course_module, course, app_user, cohort"
)

DRAFT = {
    "title": "Prompting para docentes",
    "slug": "prompting-docentes-nuevo",
    "summary": "Un resumen suficientemente largo para pasar la validación de publicación",
    "description": "Descripción larga del curso.",
    "level": "beginner",
}


async def _run_sql(statements: list[str], create_schema: bool = False) -> None:
    """Open an engine, run some SQL, dispose. One loop, one engine, no sharing."""
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
    """Run setup SQL in its own event loop.

    Deliberately synchronous. `TestClient` runs the app in an event loop of its
    own, and an async pytest fixture runs in a different one — sharing an
    asyncpg engine across the two fails with "attached to a different loop".
    `asyncio.run` gives each call a private loop and engine, so nothing is
    shared and nothing can conflict.
    """
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


def register(client: TestClient, email: str, name: str = "Eduardo Calvache") -> str:
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": name, "password": "una-clave-larga"},
        headers=NATIVE,
    ).json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {**NATIVE, "Authorization": f"Bearer {token}"}


def promote(email: str, role: Role) -> None:
    """Change a role directly in the database.

    There is no self-service path to instructor or admin, which is the point
    (PRD A-02): the role is granted, never claimed.
    """
    sql([f"UPDATE app_user SET role = '{role.value}' WHERE email = '{email}'"])


@pytest.fixture
def instructor(client: TestClient) -> str:
    token = register(client, "eduardo@manta.gob.ec")
    promote("eduardo@manta.gob.ec", Role.INSTRUCTOR)
    return token


class TestRoleGate:
    def test_a_student_cannot_reach_authoring(self, client: TestClient) -> None:
        token = register(client, "ana@colegio.edu", "Ana Pérez")

        assert client.get(f"{API}/courses", headers=auth(token)).status_code == 403

    def test_authoring_needs_a_session(self, client: TestClient) -> None:
        assert client.get(f"{API}/courses").status_code == 401

    def test_an_instructor_gets_in(self, client: TestClient, instructor: str) -> None:
        assert client.get(f"{API}/courses", headers=auth(instructor)).status_code == 200


class TestAuthoring:
    def test_a_new_course_starts_as_a_draft(self, client: TestClient, instructor: str) -> None:
        # Nobody should discover their half-written course in the catalog.
        response = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor))

        assert response.status_code == 201
        assert response.json()["status"] == "draft"

    def test_a_draft_does_not_appear_in_the_public_catalog(
        self, client: TestClient, instructor: str
    ) -> None:
        client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor))

        catalog = client.get("/api/v1/catalog/courses").json()["items"]

        assert catalog == []

    def test_but_it_does_appear_in_my_own_listing(
        self, client: TestClient, instructor: str
    ) -> None:
        # An author needs to see their unpublished work — which is exactly what
        # the public listing hides.
        client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor))

        mine = client.get(f"{API}/courses", headers=auth(instructor)).json()

        assert [item["slug"] for item in mine] == [DRAFT["slug"]]

    def test_a_duplicate_slug_is_refused(self, client: TestClient, instructor: str) -> None:
        client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor))

        response = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor))

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "slug_taken"

    def test_an_invalid_slug_is_rejected(self, client: TestClient, instructor: str) -> None:
        response = client.post(
            f"{API}/courses", json={**DRAFT, "slug": "con espacios"}, headers=auth(instructor)
        )

        assert response.status_code == 422


class TestPublishing:
    def test_an_empty_course_cannot_be_published_and_says_why(
        self, client: TestClient, instructor: str
    ) -> None:
        # An empty course wastes the one visit the PRD says we get.
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()

        response = client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "course_not_ready"
        assert response.json()["error"]["detail"]["blockers"]

    def test_a_module_with_no_lessons_blocks_publishing(
        self, client: TestClient, instructor: str
    ) -> None:
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()
        client.post(
            f"{API}/courses/{course['id']}/modules",
            json={"title": "Módulo vacío"},
            headers=auth(instructor),
        )

        response = client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        assert response.status_code == 409
        assert "vacíos" in " ".join(response.json()["error"]["detail"]["blockers"])

    def test_a_short_summary_blocks_publishing(self, client: TestClient, instructor: str) -> None:
        # The summary is the only thing a teacher reads in the catalog grid.
        course = client.post(
            f"{API}/courses", json={**DRAFT, "summary": "corto"}, headers=auth(instructor)
        ).json()
        module = client.post(
            f"{API}/courses/{course['id']}/modules",
            json={"title": "Módulo 1"},
            headers=auth(instructor),
        ).json()
        client.post(
            f"{API}/courses/{course['id']}/modules/{module['id']}/lessons",
            json={"title": "Lección 1", "kind": "text", "body": "contenido"},
            headers=auth(instructor),
        )

        response = client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        assert response.status_code == 409
        assert "resumen" in " ".join(response.json()["error"]["detail"]["blockers"]).lower()

    def test_a_complete_course_publishes_and_reaches_the_catalog(
        self, client: TestClient, instructor: str
    ) -> None:
        course = self.build_complete_course(client, instructor)

        response = client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        assert response.status_code == 200
        assert response.json()["status"] == "published"

        catalog = client.get("/api/v1/catalog/courses").json()["items"]
        assert [item["slug"] for item in catalog] == [DRAFT["slug"]]

    def test_unpublishing_removes_it_from_the_catalog(
        self, client: TestClient, instructor: str
    ) -> None:
        course = self.build_complete_course(client, instructor)
        client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        client.post(f"{API}/courses/{course['id']}/unpublish", headers=auth(instructor))

        assert client.get("/api/v1/catalog/courses").json()["items"] == []

    def test_unpublishing_a_draft_is_a_conflict(self, client: TestClient, instructor: str) -> None:
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()

        response = client.post(f"{API}/courses/{course['id']}/unpublish", headers=auth(instructor))

        assert response.status_code == 409

    def test_republishing_keeps_the_original_publication_date(
        self, client: TestClient, instructor: str
    ) -> None:
        # Otherwise an old course jumps back to the top of the catalog as if it
        # were new.
        course = self.build_complete_course(client, instructor)
        first = client.post(
            f"{API}/courses/{course['id']}/publish", headers=auth(instructor)
        ).json()
        client.post(f"{API}/courses/{course['id']}/unpublish", headers=auth(instructor))

        again = client.post(
            f"{API}/courses/{course['id']}/publish", headers=auth(instructor)
        ).json()

        assert again["published_at"] == first["published_at"]

    @staticmethod
    def build_complete_course(client: TestClient, token: str) -> dict:  # type: ignore[type-arg]
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(token)).json()
        module = client.post(
            f"{API}/courses/{course['id']}/modules",
            json={"title": "Qué es un prompt"},
            headers=auth(token),
        ).json()
        client.post(
            f"{API}/courses/{course['id']}/modules/{module['id']}/lessons",
            json={
                "title": "Anatomía de un prompt",
                "kind": "text",
                "duration_seconds": 420,
                "body": "Rol, contexto, tarea y formato.",
            },
            headers=auth(token),
        )
        return course  # type: ignore[no-any-return]


class TestOwnership:
    def test_an_instructor_cannot_edit_another_instructors_course(
        self, client: TestClient, instructor: str
    ) -> None:
        # The rule that matters most here: getting it wrong once lets one
        # instructor rewrite another's work.
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()

        other = register(client, "otro@instituto.edu", "Otro Instructor")
        promote("otro@instituto.edu", Role.INSTRUCTOR)

        response = client.put(
            f"{API}/courses/{course['id']}",
            json={**DRAFT, "title": "Secuestrado"},
            headers=auth(other),
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "not_your_course"

    def test_nor_publish_it(self, client: TestClient, instructor: str) -> None:
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()
        other = register(client, "otro@instituto.edu", "Otro Instructor")
        promote("otro@instituto.edu", Role.INSTRUCTOR)

        assert (
            client.post(f"{API}/courses/{course['id']}/publish", headers=auth(other)).status_code
            == 403
        )

    def test_nor_add_a_lesson_through_a_module_id(
        self, client: TestClient, instructor: str
    ) -> None:
        # Without the course-scoped module check, an instructor could append
        # lessons to somebody else's course by passing its module id.
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()
        module = client.post(
            f"{API}/courses/{course['id']}/modules",
            json={"title": "Módulo 1"},
            headers=auth(instructor),
        ).json()

        other = register(client, "otro@instituto.edu", "Otro Instructor")
        promote("otro@instituto.edu", Role.INSTRUCTOR)
        their_course = client.post(
            f"{API}/courses", json={**DRAFT, "slug": "otro-curso-distinto"}, headers=auth(other)
        ).json()

        response = client.post(
            f"{API}/courses/{their_course['id']}/modules/{module['id']}/lessons",
            json={"title": "Colada", "kind": "text"},
            headers=auth(other),
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "module_not_found"

    def test_an_admin_can_edit_anyones_course(self, client: TestClient, instructor: str) -> None:
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()
        admin = register(client, "admin@ilia.app", "Admin")
        promote("admin@ilia.app", Role.ADMIN)

        response = client.put(
            f"{API}/courses/{course['id']}",
            json={**DRAFT, "title": "Corregido por admin"},
            headers=auth(admin),
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Corregido por admin"


class TestRoster:
    def test_it_lists_who_enrolled_and_how_far_they_got(
        self, client: TestClient, instructor: str
    ) -> None:
        course = TestPublishing.build_complete_course(client, instructor)
        client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        student = register(client, "ana@colegio.edu", "Ana Pérez")
        client.post(
            "/api/v1/enrollments",
            json={"course_slug": DRAFT["slug"]},
            headers=auth(student),
        )

        roster = client.get(f"{API}/courses/{course['id']}/roster", headers=auth(instructor)).json()

        assert len(roster) == 1
        assert roster[0]["full_name"] == "Ana Pérez"
        assert roster[0]["lessons_total"] == 1
        assert roster[0]["lessons_completed"] == 0
        assert roster[0]["percentage"] == 0

    def test_progress_shows_up_in_the_roster(self, client: TestClient, instructor: str) -> None:
        course = TestPublishing.build_complete_course(client, instructor)
        client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))
        student = register(client, "ana@colegio.edu", "Ana Pérez")
        client.post(
            "/api/v1/enrollments", json={"course_slug": DRAFT["slug"]}, headers=auth(student)
        )

        detail = client.get(f"/api/v1/catalog/courses/{DRAFT['slug']}").json()
        lesson_id = detail["modules"][0]["lessons"][0]["id"]
        client.post(
            f"/api/v1/enrollments/me/{DRAFT['slug']}/lessons/{lesson_id}/complete",
            headers=auth(student),
        )

        roster = client.get(f"{API}/courses/{course['id']}/roster", headers=auth(instructor)).json()

        assert roster[0]["lessons_completed"] == 1
        assert roster[0]["percentage"] == 100

    def test_another_instructor_cannot_read_the_roster(
        self, client: TestClient, instructor: str
    ) -> None:
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()
        other = register(client, "otro@instituto.edu", "Otro Instructor")
        promote("otro@instituto.edu", Role.INSTRUCTOR)

        assert (
            client.get(f"{API}/courses/{course['id']}/roster", headers=auth(other)).status_code
            == 403
        )
