"""HTTP tests for enrollment and progress.

The rule this file defends: identity comes from the token, never from the
request. Nothing here lets one teacher act as another.
"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryProgressRepository,
)
from app.main import create_app
from tests.test_catalog_use_cases import make_course

NATIVE = {"X-Client-Platform": "native"}
COHORT_ID = uuid4()
COHORT_CODE = "MANTA-SEP-01"

ENROLLMENTS = "/api/v1/enrollments"


@pytest.fixture
def app_with_catalog(settings: Settings):  # type: ignore[no-untyped-def]
    app = create_app(settings)
    app.state.catalog["courses"] = InMemoryCourseRepository(
        [make_course("ia-basica", lessons=3), make_course("otro-curso", lessons=2)]
    )
    app.state.enrollment["enrollments"] = InMemoryEnrollmentRepository()
    app.state.enrollment["progress"] = InMemoryProgressRepository()
    app.state.enrollment["cohorts"] = InMemoryCohortRepository({COHORT_CODE: COHORT_ID})
    return app


@pytest.fixture
def client(app_with_catalog) -> TestClient:  # type: ignore[no-untyped-def]
    return TestClient(app_with_catalog)


def register(client: TestClient, email: str = "docente@colegio.edu") -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Ana Pérez", "password": "Una-clave-larga1!"},
        headers=NATIVE,
    )
    return response.json()["access_token"]  # type: ignore[no-any-return]


def auth(token: str) -> dict[str, str]:
    return {**NATIVE, "Authorization": f"Bearer {token}"}


class TestAuthenticationRequired:
    def test_enrolling_needs_a_session(self, client: TestClient) -> None:
        response = client.post(ENROLLMENTS, json={"course_slug": "ia-basica"})

        assert response.status_code == 401

    def test_my_courses_needs_a_session(self, client: TestClient) -> None:
        assert client.get(f"{ENROLLMENTS}/me").status_code == 401

    def test_progress_needs_a_session(self, client: TestClient) -> None:
        assert client.get(f"{ENROLLMENTS}/me/ia-basica").status_code == 401


class TestEnroll:
    def test_creates_the_enrollment(self, client: TestClient) -> None:
        token = register(client)

        response = client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        assert response.status_code == 201
        assert response.json()["cohort_id"] is None

    def test_the_course_then_appears_in_my_courses(self, client: TestClient) -> None:
        # PRD E-03: after confirming, the course is in "Mis cursos".
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        response = client.get(f"{ENROLLMENTS}/me", headers=auth(token))

        assert [item["course"]["slug"] for item in response.json()] == ["ia-basica"]

    def test_enrolling_twice_is_a_conflict(self, client: TestClient) -> None:
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        response = client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "already_enrolled"

    def test_an_unknown_course_is_404(self, client: TestClient) -> None:
        token = register(client)

        response = client.post(ENROLLMENTS, json={"course_slug": "no-existe"}, headers=auth(token))

        assert response.status_code == 404

    def test_a_cohort_code_is_recorded(self, client: TestClient) -> None:
        token = register(client)

        response = client.post(
            ENROLLMENTS,
            json={"course_slug": "ia-basica", "cohort_code": COHORT_CODE},
            headers=auth(token),
        )

        assert response.json()["cohort_id"] == str(COHORT_ID)

    def test_an_unknown_cohort_code_is_rejected(self, client: TestClient) -> None:
        token = register(client)

        response = client.post(
            ENROLLMENTS,
            json={"course_slug": "ia-basica", "cohort_code": "INVENTADO"},
            headers=auth(token),
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "cohort_not_found"


class TestProgress:
    def test_a_fresh_enrollment_points_at_the_first_lesson(self, client: TestClient) -> None:
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        body = client.get(f"{ENROLLMENTS}/me/ia-basica", headers=auth(token)).json()

        assert body["percentage"] == 0
        assert body["total_lessons"] == 3
        assert body["next_lesson"]["lesson_title"] == "Lección 1"

    def test_completing_a_lesson_advances_the_pointer(
        self, client: TestClient, app_with_catalog
    ) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))
        lessons = _lesson_ids_sync(app_with_catalog, "ia-basica")

        body = client.post(
            f"{ENROLLMENTS}/me/ia-basica/lessons/{lessons[0]}/complete", headers=auth(token)
        ).json()

        assert body["completed_lessons"] == 1
        assert body["percentage"] == 33
        assert body["next_lesson"]["lesson_title"] == "Lección 2"

    def test_completing_the_same_lesson_twice_is_idempotent(
        self, client: TestClient, app_with_catalog
    ) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))
        lessons = _lesson_ids_sync(app_with_catalog, "ia-basica")
        url = f"{ENROLLMENTS}/me/ia-basica/lessons/{lessons[0]}/complete"

        client.post(url, headers=auth(token))
        body = client.post(url, headers=auth(token)).json()

        assert body["completed_lessons"] == 1

    def test_finishing_every_lesson_clears_the_next_pointer(
        self, client: TestClient, app_with_catalog
    ) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        body = {}
        for lesson_id in _lesson_ids_sync(app_with_catalog, "ia-basica"):
            body = client.post(
                f"{ENROLLMENTS}/me/ia-basica/lessons/{lesson_id}/complete",
                headers=auth(token),
            ).json()

        assert body["percentage"] == 100
        assert body["is_complete"] is True
        assert body["next_lesson"] is None

    def test_progress_without_enrolling_is_403(self, client: TestClient) -> None:
        token = register(client)

        response = client.get(f"{ENROLLMENTS}/me/ia-basica", headers=auth(token))

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "not_enrolled"

    def test_a_lesson_from_another_course_is_404(
        self, client: TestClient, app_with_catalog
    ) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))
        foreign = _lesson_ids_sync(app_with_catalog, "otro-curso")[0]

        response = client.post(
            f"{ENROLLMENTS}/me/ia-basica/lessons/{foreign}/complete", headers=auth(token)
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "lesson_not_found"


class TestIsolationBetweenTeachers:
    def test_one_teacher_cannot_see_anothers_courses(self, client: TestClient) -> None:
        ana = register(client, "ana@colegio.edu")
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(ana))

        luis = register(client, "luis@colegio.edu")

        assert client.get(f"{ENROLLMENTS}/me", headers=auth(luis)).json() == []

    def test_progress_is_per_teacher(self, client: TestClient, app_with_catalog) -> None:  # type: ignore[no-untyped-def]
        ana = register(client, "ana@colegio.edu")
        luis = register(client, "luis@colegio.edu")
        for token in (ana, luis):
            client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        lessons = _lesson_ids_sync(app_with_catalog, "ia-basica")
        client.post(f"{ENROLLMENTS}/me/ia-basica/lessons/{lessons[0]}/complete", headers=auth(ana))

        body = client.get(f"{ENROLLMENTS}/me/ia-basica", headers=auth(luis)).json()

        assert body["completed_lessons"] == 0


def _lesson_ids_sync(app, slug: str) -> list[str]:  # type: ignore[no-untyped-def]
    """Read the seeded lesson ids without an event loop.

    The in-memory repository holds the entities directly, so the test can reach
    into them; against SQL this would be a query, which is what the integration
    suite does instead.
    """
    repository = app.state.catalog["courses"]
    course = next(item for item in repository._courses if str(item.slug) == slug)
    return [
        str(lesson.id) for module in course.ordered_modules for lesson in module.ordered_lessons
    ]
