"""HTTP tests for admin cohort create/list.

Admin-only. Students keep joining with optional `cohort_code` on enroll — that
path already exists; these tests prove a charla can be created without seed.
"""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.auth.domain.entities import Role
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryProgressRepository,
)
from app.main import create_app
from tests.test_catalog_use_cases import make_course

NATIVE = {"X-Client-Platform": "native"}
COHORTS = "/api/v1/admin/cohorts"
ENROLLMENTS = "/api/v1/enrollments"
COHORT_CODE = "MANTA-SEP-01"
COHORT_NAME = "Charla Manta — septiembre 2026"


def make_client(settings: Settings) -> TestClient:
    app = create_app(settings)
    app.state.catalog["courses"] = InMemoryCourseRepository([make_course("ia-basica", lessons=3)])
    app.state.enrollment["enrollments"] = InMemoryEnrollmentRepository()
    app.state.enrollment["progress"] = InMemoryProgressRepository()
    app.state.enrollment["cohorts"] = InMemoryCohortRepository()
    return TestClient(app)


def register(client: TestClient, email: str = "ana@colegio.edu") -> dict[str, object]:
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Ana Pérez", "password": "Una-clave-larga1!"},
        headers=NATIVE,
    ).json()


def auth(token: str) -> dict[str, str]:
    return {**NATIVE, "Authorization": f"Bearer {token}"}


def promote(client: TestClient, email: str) -> None:
    repo = client.app.state.auth["users"]
    user = next(item for item in repo._by_id.values() if str(item.email) == email)
    user.role = Role.ADMIN


def admin_token(client: TestClient, email: str = "admin@ilia.app") -> str:
    body = register(client, email)
    promote(client, email)
    return str(body["access_token"])


class TestRoleGate:
    def test_a_student_is_refused(self, settings: Settings) -> None:
        client = make_client(settings)
        token = str(register(client)["access_token"])

        response = client.post(
            COHORTS, json={"name": COHORT_NAME, "code": COHORT_CODE}, headers=auth(token)
        )

        assert response.status_code == 403

    def test_listing_is_also_refused_to_a_student(self, settings: Settings) -> None:
        client = make_client(settings)
        token = str(register(client)["access_token"])

        assert client.get(COHORTS, headers=auth(token)).status_code == 403

    def test_an_unauthenticated_caller_is_401(self, settings: Settings) -> None:
        client = make_client(settings)

        assert client.get(COHORTS).status_code == 401


class TestCreateAndList:
    def test_an_admin_creates_a_cohort(self, settings: Settings) -> None:
        client = make_client(settings)
        token = admin_token(client)

        response = client.post(
            COHORTS, json={"name": COHORT_NAME, "code": COHORT_CODE}, headers=auth(token)
        )

        assert response.status_code == 201
        body = response.json()
        assert body["code"] == COHORT_CODE
        assert body["name"] == COHORT_NAME
        assert body["created_at"] is not None

    def test_the_same_code_twice_is_a_conflict(self, settings: Settings) -> None:
        client = make_client(settings)
        token = admin_token(client)
        payload = {"name": COHORT_NAME, "code": COHORT_CODE}
        client.post(COHORTS, json=payload, headers=auth(token))

        response = client.post(COHORTS, json=payload, headers=auth(token))

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "cohort_code_taken"

    def test_list_shows_code_and_name(self, settings: Settings) -> None:
        client = make_client(settings)
        token = admin_token(client)
        client.post(COHORTS, json={"name": COHORT_NAME, "code": COHORT_CODE}, headers=auth(token))

        page = client.get(COHORTS, headers=auth(token)).json()

        assert [(item["code"], item["name"]) for item in page["items"]] == [
            (COHORT_CODE, COHORT_NAME)
        ]
        assert page["items"][0]["created_at"] is not None


class TestEnrollStillUsesCohortCode:
    def test_a_teacher_joins_with_the_code_an_admin_just_created(self, settings: Settings) -> None:
        client = make_client(settings)
        admin = admin_token(client)
        created = client.post(
            COHORTS, json={"name": COHORT_NAME, "code": COHORT_CODE}, headers=auth(admin)
        ).json()

        teacher = str(register(client, "luis@colegio.edu")["access_token"])
        response = client.post(
            ENROLLMENTS,
            json={"course_slug": "ia-basica", "cohort_code": COHORT_CODE},
            headers=auth(teacher),
        )

        assert response.status_code == 201
        assert response.json()["cohort_id"] == created["id"]
