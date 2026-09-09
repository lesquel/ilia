"""The freemium gates, against a real PostgreSQL (PRD §11).

Four things the free plan does not include: courses above the basic path,
downloadable certificates, posting in the forum, and an unlimited evaluation
quota. Each is checked where a teacher would actually hit it.
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

TABLES = (
    "subscription, audit_log, lesson_progress, enrollment, certificate, forum_post, "
    "forum_thread, evaluation_score, evaluation, model_output, llm_usage, submission, "
    "activity, rubric_dimension, rubric, lesson, course_module, course, app_user, "
    "cohort, plan"
)

# The plans under test. Numbers are [A confirmar] in production; here they are
# fixed so the gates have something unambiguous to be checked against.
PLANS = """
INSERT INTO plan (id, code, name, description, monthly_evaluations, allowed_levels,
                  can_issue_certificates, can_post_in_forum, price_cents, is_default)
VALUES
 (gen_random_uuid(), 'free', 'Gratis', '', 2, '["beginner"]', false, false, 0, true),
 (gen_random_uuid(), 'pro', 'Completo', '', 200,
  '["beginner","intermediate","expert"]', true, true, null, false)
"""


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
    sql([f"TRUNCATE {TABLES} CASCADE", PLANS], create_schema=True)

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


def subscribe(email: str, plan_code: str) -> None:
    sql(
        [
            "INSERT INTO subscription (id, user_id, plan_code, started_at) "
            f"SELECT gen_random_uuid(), id, '{plan_code}', now() "
            f"FROM app_user WHERE email = '{email}'"
        ]
    )


def publish_course(client: TestClient, token: str, slug: str, level: str) -> str:
    course = client.post(
        "/api/v1/instructor/courses",
        json={
            "title": f"Curso {level}",
            "slug": slug,
            "summary": "Un resumen suficientemente largo para poder publicar el curso",
            "description": "Descripción",
            "level": level,
        },
        headers=auth(token),
    ).json()

    module = client.post(
        f"/api/v1/instructor/courses/{course['id']}/modules",
        json={"title": "Módulo 1"},
        headers=auth(token),
    ).json()

    client.post(
        f"/api/v1/instructor/courses/{course['id']}/modules/{module['id']}/lessons",
        json={"title": "Lección 1", "kind": "text", "body": "contenido"},
        headers=auth(token),
    )

    client.post(f"/api/v1/instructor/courses/{course['id']}/publish", headers=auth(token))
    return slug


@pytest.fixture
def instructor(client: TestClient) -> str:
    token = register(client, "eduardo@manta.gob.ec", "Eduardo")["access_token"]
    promote("eduardo@manta.gob.ec", Role.INSTRUCTOR)
    return token


class TestDefaultPlan:
    def test_a_new_teacher_lands_on_the_free_plan(self, client: TestClient) -> None:
        token = register(client, "ana@colegio.edu")["access_token"]

        body = client.get("/api/v1/billing/me", headers=auth(token)).json()

        assert body["plan"]["code"] == "free"
        assert body["evaluations_remaining"] == 2

    def test_the_plans_are_public(self, client: TestClient) -> None:
        # Someone deciding whether to sign up needs to see what they get.
        response = client.get("/api/v1/billing/plans")

        assert response.status_code == 200
        assert {item["code"] for item in response.json()} == {"free", "pro"}

    def test_the_paid_plan_shows_no_invented_price(self, client: TestClient) -> None:
        # PRD open question 4 leaves pricing undecided. Null, not a number
        # nobody agreed to.
        plans = {item["code"]: item for item in client.get("/api/v1/billing/plans").json()}

        assert plans["pro"]["price_cents"] is None

    def test_staff_are_not_customers(self, client: TestClient, instructor: str) -> None:
        # Billing an instructor for evaluating their own activity would be
        # absurd, and would make courses impossible to test before publishing.
        body = client.get("/api/v1/billing/me", headers=auth(instructor)).json()

        assert body["evaluations_remaining"] is None
        assert body["can_post_in_forum"] is True


class TestLevelGate:
    def test_the_free_plan_can_join_the_basic_path(
        self, client: TestClient, instructor: str
    ) -> None:
        publish_course(client, instructor, "basico", "beginner")
        token = register(client, "ana@colegio.edu")["access_token"]

        response = client.post(
            "/api/v1/enrollments", json={"course_slug": "basico"}, headers=auth(token)
        )

        assert response.status_code == 201

    def test_but_not_an_expert_course(self, client: TestClient, instructor: str) -> None:
        publish_course(client, instructor, "experto", "expert")
        token = register(client, "ana@colegio.edu")["access_token"]

        response = client.post(
            "/api/v1/enrollments", json={"course_slug": "experto"}, headers=auth(token)
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "plan_level_not_allowed"

    def test_the_paid_plan_can(self, client: TestClient, instructor: str) -> None:
        publish_course(client, instructor, "experto", "expert")
        register(client, "ana@colegio.edu")
        subscribe("ana@colegio.edu", "pro")
        token = client.post(
            "/api/v1/auth/login",
            json={"email": "ana@colegio.edu", "password": "una-clave-larga"},
            headers=NATIVE,
        ).json()["access_token"]

        response = client.post(
            "/api/v1/enrollments", json={"course_slug": "experto"}, headers=auth(token)
        )

        assert response.status_code == 201

    def test_the_expert_course_is_still_visible_in_the_catalog(
        self, client: TestClient, instructor: str
    ) -> None:
        # The gate is on enrolling, not on seeing. Hiding it would stop the
        # teacher discovering there is something worth paying for.
        publish_course(client, instructor, "experto", "expert")

        slugs = [item["slug"] for item in client.get("/api/v1/catalog/courses").json()["items"]]

        assert "experto" in slugs


class TestForumGate:
    def setup_forum(self, client: TestClient, instructor: str) -> str:
        publish_course(client, instructor, "basico", "beginner")
        token = register(client, "ana@colegio.edu")["access_token"]
        client.post("/api/v1/enrollments", json={"course_slug": "basico"}, headers=auth(token))
        return token

    def test_the_free_plan_can_read_the_forum(self, client: TestClient, instructor: str) -> None:
        token = self.setup_forum(client, instructor)

        assert client.get("/api/v1/forum/basico/threads", headers=auth(token)).status_code == 200

    def test_but_not_post_in_it(self, client: TestClient, instructor: str) -> None:
        # PRD 11: free reads, paid participates.
        token = self.setup_forum(client, instructor)

        response = client.post(
            "/api/v1/forum/basico/threads",
            json={"title": "Una duda", "body": "cuerpo"},
            headers=auth(token),
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "plan_posting_not_allowed"

    def test_the_paid_plan_can_post(self, client: TestClient, instructor: str) -> None:
        self.setup_forum(client, instructor)
        subscribe("ana@colegio.edu", "pro")
        token = client.post(
            "/api/v1/auth/login",
            json={"email": "ana@colegio.edu", "password": "una-clave-larga"},
            headers=NATIVE,
        ).json()["access_token"]

        response = client.post(
            "/api/v1/forum/basico/threads",
            json={"title": "Una duda", "body": "cuerpo"},
            headers=auth(token),
        )

        assert response.status_code == 201

    def test_replying_is_gated_too_not_only_opening_a_thread(
        self, client: TestClient, instructor: str
    ) -> None:
        """The gate the client screen had forgotten.

        The forum listing hid its composer from a free account; the thread
        detail did not, so someone could write a full reply and be refused
        afterwards. The API always refused — this pins it, so the two cannot
        drift apart again.
        """
        # Sets up the course and enrols someone; the tokens this test needs are
        # created below.
        self.setup_forum(client, instructor)

        subscribe("ana@colegio.edu", "pro")
        author = client.post(
            "/api/v1/auth/login",
            json={"email": "ana@colegio.edu", "password": "una-clave-larga"},
            headers=NATIVE,
        ).json()["access_token"]
        thread = client.post(
            "/api/v1/forum/basico/threads",
            json={"title": "Una duda", "body": "cuerpo"},
            headers=auth(author),
        ).json()

        # A second teacher on the free plan.
        free = register(client, "bea@colegio.edu")["access_token"]
        client.post("/api/v1/enrollments", json={"course_slug": "basico"}, headers=auth(free))

        # Reading the thread is fine.
        assert (
            client.get(
                f"/api/v1/forum/basico/threads/{thread['id']}", headers=auth(free)
            ).status_code
            == 200
        )

        # Replying is not.
        response = client.post(
            f"/api/v1/forum/basico/threads/{thread['id']}/replies",
            json={"body": "quiero responder"},
            headers=auth(free),
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "plan_posting_not_allowed"


class TestCertificateGate:
    def finish_basic_course(self, client: TestClient, instructor: str) -> str:
        publish_course(client, instructor, "basico", "beginner")
        token = register(client, "ana@colegio.edu")["access_token"]
        client.post("/api/v1/enrollments", json={"course_slug": "basico"}, headers=auth(token))

        detail = client.get("/api/v1/catalog/courses/basico").json()
        for module in detail["modules"]:
            for lesson in module["lessons"]:
                client.post(
                    f"/api/v1/enrollments/me/basico/lessons/{lesson['id']}/complete",
                    headers=auth(token),
                )

        return token

    def test_eligibility_is_shown_to_everyone(self, client: TestClient, instructor: str) -> None:
        # A teacher who earned it should know they earned it, even if their
        # plan does not hand it over.
        token = self.finish_basic_course(client, instructor)

        body = client.get("/api/v1/certificates/eligibility/basico", headers=auth(token)).json()

        assert body["met"] is True

    def test_but_the_free_plan_cannot_download_it(
        self, client: TestClient, instructor: str
    ) -> None:
        token = self.finish_basic_course(client, instructor)

        response = client.post("/api/v1/certificates/basico", headers=auth(token))

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "plan_certificates_not_allowed"

    def test_the_paid_plan_can(self, client: TestClient, instructor: str) -> None:
        self.finish_basic_course(client, instructor)
        subscribe("ana@colegio.edu", "pro")
        token = client.post(
            "/api/v1/auth/login",
            json={"email": "ana@colegio.edu", "password": "una-clave-larga"},
            headers=NATIVE,
        ).json()["access_token"]

        response = client.post("/api/v1/certificates/basico", headers=auth(token))

        assert response.status_code == 201


class TestEvaluationQuota:
    """The main lever of the free tier (PRD §11).

    The platform pays for the tokens, so the quota is what keeps a free account
    from being an open tab at the provider.
    """

    def build_activity(self, client: TestClient, instructor: str) -> tuple[str, str]:
        publish_course(client, instructor, "basico", "beginner")
        detail = client.get("/api/v1/catalog/courses/basico").json()
        module_id = detail["modules"][0]["id"]
        course_id = detail["id"]

        sql(
            [
                "INSERT INTO rubric (id, version, name) "
                "VALUES ('11111111-1111-1111-1111-111111111111', 1, 'Base')",
                "INSERT INTO rubric_dimension "
                "(id, rubric_id, key, name, description, kind, weight) "
                "VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', "
                "'claridad', 'Claridad', '', 'prompt', 1)",
                "INSERT INTO activity (id, module_id, course_id, rubric_id, title, statement, "
                "max_attempts, checks) VALUES "
                "('22222222-2222-2222-2222-222222222222', "
                f"'{module_id}', '{course_id}', "
                "'11111111-1111-1111-1111-111111111111', 'Actividad', 'Escribí un prompt', "
                "10, '{}')",
            ]
        )

        token = register(client, "ana@colegio.edu")["access_token"]
        client.post("/api/v1/enrollments", json={"course_slug": "basico"}, headers=auth(token))

        return "22222222-2222-2222-2222-222222222222", token

    def submit(self, client: TestClient, activity_id: str, token: str):  # type: ignore[no-untyped-def]
        return client.post(
            f"/api/v1/lab/activities/{activity_id}/submissions",
            json={"prompt": "Actuá como docente y armá una guía en una tabla."},
            headers=auth(token),
        )

    def wait_for_scoring(self, client: TestClient, submission_id: str, token: str) -> None:
        """Poll until the evaluation lands.

        Evaluation is asynchronous, so the usage row the quota counts is written
        after the response. Polling is what a real client does; sleeping a fixed
        amount is what makes a test flaky.
        """
        for _ in range(50):
            body = client.get(
                f"/api/v1/lab/submissions/{submission_id}", headers=auth(token)
            ).json()
            if body["submission"]["status"] in {"scored", "failed"}:
                return
        raise AssertionError("the evaluation never finished")

    def test_the_free_quota_runs_out(self, client: TestClient, instructor: str) -> None:
        # The test plan allows two evaluations a month.
        activity_id, token = self.build_activity(client, instructor)

        for _ in range(2):
            response = self.submit(client, activity_id, token)
            assert response.status_code == 202
            self.wait_for_scoring(client, response.json()["id"], token)

        third = self.submit(client, activity_id, token)

        assert third.status_code == 429
        assert third.json()["error"]["code"] == "evaluation_quota_exceeded"

    def test_the_remaining_quota_is_visible_before_it_runs_out(
        self, client: TestClient, instructor: str
    ) -> None:
        # A teacher should see the limit coming, not discover it at the wall.
        activity_id, token = self.build_activity(client, instructor)

        before = client.get("/api/v1/billing/me", headers=auth(token)).json()
        response = self.submit(client, activity_id, token)
        self.wait_for_scoring(client, response.json()["id"], token)
        after = client.get("/api/v1/billing/me", headers=auth(token)).json()

        assert before["evaluations_remaining"] == 2
        assert after["evaluations_remaining"] == 1
