"""Instructor endpoints against a real PostgreSQL.

Authoring writes to tables, so these run against the database rather than a
fake. The rule they exist to defend: an instructor edits their own courses and
nobody else's.
"""

import asyncio
import os
from collections.abc import Iterator
from typing import ClassVar

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
        # Fake S3 credentials so upload URLs can be signed. The local adapter
        # refuses uploads on purpose, and the media tests need a provider that
        # issues them — no request ever leaves the process: signing is local.
        storage_provider="s3",
        storage_bucket="ilia-test",
        storage_access_key="AKIATEST",
        storage_secret_key="secreto-de-prueba",
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


class TestCourseAddress:
    """Changing a published course's slug.

    The address of a published course is in students' bookmarks and in whatever
    the instructor pasted into a staff group. We keep no alias, so changing it
    would silently 404 every link already in circulation.
    """

    def build_complete_course(self, client: TestClient, token: str) -> dict:  # type: ignore[type-arg]
        return TestPublishing.build_complete_course(client, token)

    def test_a_draft_can_be_renamed_freely(self, client: TestClient, instructor: str) -> None:
        # Nothing points at it yet, so there is nothing to break.
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(instructor)).json()

        response = client.put(
            f"{API}/courses/{course['id']}",
            json={**DRAFT, "slug": "otro-nombre"},
            headers=auth(instructor),
        )

        assert response.status_code == 200
        assert response.json()["slug"] == "otro-nombre"

    def test_a_published_course_keeps_its_address(
        self, client: TestClient, instructor: str
    ) -> None:
        course = self.build_complete_course(client, instructor)
        client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        response = client.put(
            f"{API}/courses/{course['id']}",
            json={**DRAFT, "slug": "direccion-nueva"},
            headers=auth(instructor),
        )

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "published_slug_change"
        # And the old address still works, which is the whole point.
        assert client.get(f"/api/v1/catalog/courses/{DRAFT['slug']}").status_code == 200

    def test_everything_else_stays_editable_while_published(
        self, client: TestClient, instructor: str
    ) -> None:
        # The rule protects the address, not the course. An instructor must
        # still be able to fix a typo in the title of a live course.
        course = self.build_complete_course(client, instructor)
        client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))

        response = client.put(
            f"{API}/courses/{course['id']}",
            json={**DRAFT, "title": "Prompting para docentes (2026)"},
            headers=auth(instructor),
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Prompting para docentes (2026)"

    def test_withdrawing_it_reopens_the_address(self, client: TestClient, instructor: str) -> None:
        # The way through: the breakage becomes a decision somebody took.
        course = self.build_complete_course(client, instructor)
        client.post(f"{API}/courses/{course['id']}/publish", headers=auth(instructor))
        client.post(f"{API}/courses/{course['id']}/unpublish", headers=auth(instructor))

        response = client.put(
            f"{API}/courses/{course['id']}",
            json={**DRAFT, "slug": "direccion-nueva"},
            headers=auth(instructor),
        )

        assert response.status_code == 200


class TestLessonMedia:
    """Uploading a lesson's video.

    The upload goes straight from the instructor's browser to the storage, so
    the two things this API still owns are: who may upload, and where.
    """

    def lesson_of(self, client: TestClient, token: str) -> tuple[str, str]:
        """A course with one lesson, returning both ids.

        Built here rather than reused from `TestPublishing`: that helper does
        not hand back the lesson id, and reading it from the public catalogue
        would not work for a course that is still a draft.
        """
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(token)).json()
        module = client.post(
            f"{API}/courses/{course['id']}/modules",
            json={"title": "Qué es un prompt"},
            headers=auth(token),
        ).json()
        lesson = client.post(
            f"{API}/courses/{course['id']}/modules/{module['id']}/lessons",
            json={
                "title": "Anatomía de un prompt",
                "kind": "video",
                "duration_seconds": 420,
                "body": "Rol, contexto, tarea y formato.",
            },
            headers=auth(token),
        ).json()
        return course["id"], lesson["id"]

    def test_it_hands_back_a_signed_url_and_a_key_it_chose(
        self, client: TestClient, instructor: str
    ) -> None:
        course_id, lesson_id = self.lesson_of(client, instructor)

        response = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"content_type": "video/mp4"},
            headers=auth(instructor),
        )

        assert response.status_code == 200
        body = response.json()
        # The key is namespaced by lesson and ends in the extension for the type
        # that was signed.
        assert body["reference"].startswith(f"lessons/{lesson_id}/")
        assert body["reference"].endswith(".mp4")
        assert body["expires_in"] >= 1800

    def test_the_key_is_never_taken_from_the_client(
        self, client: TestClient, instructor: str
    ) -> None:
        # Two requests for the same lesson give different keys: the server picks
        # them, and a browser holding the old file cannot keep serving it after
        # the instructor replaces the video.
        course_id, lesson_id = self.lesson_of(client, instructor)
        payload = {"content_type": "video/mp4"}

        first = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json=payload,
            headers=auth(instructor),
        ).json()
        second = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json=payload,
            headers=auth(instructor),
        ).json()

        assert first["reference"] != second["reference"]

    def test_an_unsupported_type_is_refused(self, client: TestClient, instructor: str) -> None:
        # The content type is signed into the URL. Allowing text/html would mean
        # a file served from our own domain that we did not write.
        course_id, lesson_id = self.lesson_of(client, instructor)

        response = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"content_type": "text/html"},
            headers=auth(instructor),
        )

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "unsupported_media_type"

    def test_a_lesson_from_another_course_is_refused(
        self, client: TestClient, instructor: str
    ) -> None:
        # Otherwise passing a lesson id would be enough to attach media to
        # somebody else's course.
        course_id, lesson_id = self.lesson_of(client, instructor)
        other = client.post(
            f"{API}/courses",
            json={**DRAFT, "slug": "otro-curso"},
            headers=auth(instructor),
        ).json()

        response = client.post(
            f"{API}/courses/{other['id']}/lessons/{lesson_id}/media",
            json={"content_type": "video/mp4"},
            headers=auth(instructor),
        )

        assert response.status_code == 404
        assert course_id != other["id"]

    def test_attaching_makes_the_media_reachable_to_an_enrolled_teacher(
        self, client: TestClient, instructor: str
    ) -> None:
        course_id, lesson_id = self.lesson_of(client, instructor)
        prepared = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"content_type": "video/mp4"},
            headers=auth(instructor),
        ).json()

        attached = client.put(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"reference": prepared["reference"]},
            headers=auth(instructor),
        )

        assert attached.status_code == 204

        client.post(f"{API}/courses/{course_id}/publish", headers=auth(instructor))
        client.post(
            "/api/v1/enrollments",
            json={"course_slug": DRAFT["slug"]},
            headers=auth(instructor),
        )
        lesson = client.get(
            f"/api/v1/enrollments/me/{DRAFT['slug']}/lessons/{lesson_id}",
            headers=auth(instructor),
        ).json()

        assert lesson.get("resource_ref") == prepared["reference"], lesson
        # And the playable link is minted server-side, after enrolment.
        assert lesson["media_url"]

    def test_a_reference_outside_the_lesson_is_refused(
        self, client: TestClient, instructor: str
    ) -> None:
        """The check that makes the whole flow safe.

        Without it an instructor could attach any key they could name — reading,
        or overwriting, a course they cannot see.
        """
        course_id, lesson_id = self.lesson_of(client, instructor)

        response = client.put(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"reference": "lessons/00000000-0000-0000-0000-000000000000/robado.mp4"},
            headers=auth(instructor),
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "foreign_media_reference"

    def test_media_can_be_cleared(self, client: TestClient, instructor: str) -> None:
        # How an instructor removes a video they uploaded by mistake.
        course_id, lesson_id = self.lesson_of(client, instructor)
        prepared = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"content_type": "video/mp4"},
            headers=auth(instructor),
        ).json()
        client.put(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"reference": prepared["reference"]},
            headers=auth(instructor),
        )

        cleared = client.put(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"reference": None},
            headers=auth(instructor),
        )

        assert cleared.status_code == 204

    def test_a_student_cannot_upload(self, client: TestClient, instructor: str) -> None:
        course_id, lesson_id = self.lesson_of(client, instructor)
        student = register(client, "alumna@colegio.edu", "Alumna")

        response = client.post(
            f"{API}/courses/{course_id}/lessons/{lesson_id}/media",
            json={"content_type": "video/mp4"},
            headers=auth(student),
        )

        assert response.status_code == 403


class TestAuthoringActivities:
    """Creating the thing the product exists for.

    Until this endpoint existed an instructor could build a course, publish it,
    and have nothing in it for a teacher to actually do — the activities in
    development were inserted by hand with SQL. A course was a reading list.
    """

    # A module-level constant, not a class attribute: a mutable default shared
    # across tests is one test away from another one's leftovers.
    ACTIVITY: ClassVar[dict[str, object]] = {
        "title": "Escribí tu primer prompt",
        "statement": "Pedile a un modelo una guía de 5 ejercicios de fracciones.",
        "max_attempts": 3,
        "dimensions": [
            {
                "key": "claridad",
                "name": "Claridad y especificidad",
                "description": "¿La instrucción es inequívoca?",
                "kind": "prompt",
                "weight": 2.0,
            },
            {
                "key": "resultado",
                "name": "Calidad del resultado",
                "description": "¿La salida cumple el objetivo?",
                "kind": "result",
                "weight": 1.0,
            },
        ],
        "required_terms": [["fracciones", "fraccionarios"]],
        "min_length": 15,
        "requires_format": True,
        "requires_role": True,
    }

    def module_of(self, client: TestClient, token: str) -> tuple[str, str]:
        course = client.post(f"{API}/courses", json=DRAFT, headers=auth(token)).json()
        module = client.post(
            f"{API}/courses/{course['id']}/modules",
            json={"title": "Qué es un prompt"},
            headers=auth(token),
        ).json()
        return course["id"], module["id"]

    def create(self, client: TestClient, token: str, **over: object):  # type: ignore[no-untyped-def]
        course_id, module_id = self.module_of(client, token)
        return course_id, client.post(
            f"{API}/courses/{course_id}/modules/{module_id}/activities",
            json={**self.ACTIVITY, **over},
            headers=auth(token),
        )

    def test_an_instructor_can_author_one(self, client: TestClient, instructor: str) -> None:
        _, response = self.create(client, instructor)

        assert response.status_code == 201
        assert response.json()["id"]

    def test_the_activity_is_reachable_by_an_enrolled_teacher(
        self, client: TestClient, instructor: str
    ) -> None:
        """The whole point: authored here, done there.

        This is the step that was missing — everything else already worked
        against activities somebody had inserted with SQL.
        """
        _, response = self.create(client, instructor)
        activity_id = response.json()["id"]

        # The course still needs a lesson to be publishable.
        modules = client.get(f"{API}/courses", headers=auth(instructor)).json()
        assert modules

        activity = client.get(
            f"/api/v1/lab/activities/{activity_id}", headers=auth(instructor)
        ).json()

        assert activity["title"] == self.ACTIVITY["title"]
        assert activity["max_attempts"] == 3
        # The dimensions the instructor wrote, plus the one they did not.
        keys = {item["key"] for item in activity["dimensions"]}
        assert {"claridad", "resultado"} <= keys

    def test_the_deterministic_anchor_is_always_added(
        self, client: TestClient, instructor: str
    ) -> None:
        """Not optional, and not the instructor's to remove.

        Without it a compromised judge decides the entire mark. That is not
        hypothetical: it is the finding that made `passed` require both the
        total and the requirements, rather than the total alone.
        """
        _, response = self.create(client, instructor)
        activity = client.get(
            f"/api/v1/lab/activities/{response.json()['id']}", headers=auth(instructor)
        ).json()

        assert "deterministic" in {item["key"] for item in activity["dimensions"]}

    def test_an_instructor_cannot_redefine_the_anchor(
        self, client: TestClient, instructor: str
    ) -> None:
        # Weighting it to zero would quietly remove the part of the grade a
        # model cannot talk up.
        _, response = self.create(
            client,
            instructor,
            dimensions=[
                *self.ACTIVITY["dimensions"],  # type: ignore[misc]
                {
                    "key": "deterministic",
                    "name": "Irrelevante",
                    "description": "",
                    "kind": "prompt",
                    "weight": 0.01,
                },
            ],
        )

        activity = client.get(
            f"/api/v1/lab/activities/{response.json()['id']}", headers=auth(instructor)
        ).json()
        anchor = next(item for item in activity["dimensions"] if item["key"] == "deterministic")

        assert anchor["name"] == "Requisitos verificables"

    def test_the_requirements_reach_the_teacher_before_they_write(
        self, client: TestClient, instructor: str
    ) -> None:
        # Failing a check nobody mentioned is a trick, not a lesson.
        _, response = self.create(client, instructor)
        activity = client.get(
            f"/api/v1/lab/activities/{response.json()['id']}", headers=auth(instructor)
        ).json()

        stated = " ".join(activity["requirements"]).lower()
        assert "fracciones" in stated
        assert "formato" in stated

    def test_an_activity_needs_at_least_one_dimension(
        self, client: TestClient, instructor: str
    ) -> None:
        _, response = self.create(client, instructor, dimensions=[])

        assert response.status_code == 422

    def test_duplicate_dimension_keys_are_refused(
        self, client: TestClient, instructor: str
    ) -> None:
        twice = dict(self.ACTIVITY["dimensions"][0])  # type: ignore[index,arg-type]
        _, response = self.create(client, instructor, dimensions=[twice, dict(twice)])

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_activity"

    def test_a_module_from_another_course_is_refused(
        self, client: TestClient, instructor: str
    ) -> None:
        # Otherwise passing a module id would be enough to add an activity to
        # somebody else's course.
        _, module_id = self.module_of(client, instructor)
        other = client.post(
            f"{API}/courses", json={**DRAFT, "slug": "otro-curso"}, headers=auth(instructor)
        ).json()

        response = client.post(
            f"{API}/courses/{other['id']}/modules/{module_id}/activities",
            json=self.ACTIVITY,
            headers=auth(instructor),
        )

        assert response.status_code == 404

    def test_a_student_cannot_author_activities(self, client: TestClient, instructor: str) -> None:
        course_id, module_id = self.module_of(client, instructor)
        student = register(client, "alumna2@colegio.edu", "Alumna")

        response = client.post(
            f"{API}/courses/{course_id}/modules/{module_id}/activities",
            json=self.ACTIVITY,
            headers=auth(student),
        )

        assert response.status_code == 403
