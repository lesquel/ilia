"""HTTP tests for the catalog.

The one rule this file exists to defend: the catalog is public, and it shows
published courses only.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.catalog.domain.entities import CourseStatus, Level
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.main import create_app
from tests.test_catalog_use_cases import make_course

COURSES = "/api/v1/catalog/courses"


@pytest.fixture
def catalog_client(settings: Settings) -> TestClient:
    app = create_app(settings)
    app.state.catalog["courses"] = InMemoryCourseRepository(
        [
            make_course("prompting-para-docentes", title="Prompting para docentes", lessons=3),
            make_course("ia-intermedia", level=Level.INTERMEDIATE, published_offset_days=2),
            make_course("borrador-oculto", status=CourseStatus.DRAFT, published_offset_days=9),
        ]
    )
    return TestClient(app)


class TestBrowse:
    def test_is_public(self, catalog_client: TestClient) -> None:
        # No credentials sent. A teacher must be able to read what a course
        # covers before creating an account (PRD E-02).
        assert catalog_client.get(COURSES).status_code == 200

    def test_lists_only_published_courses(self, catalog_client: TestClient) -> None:
        slugs = [item["slug"] for item in catalog_client.get(COURSES).json()["items"]]

        assert "borrador-oculto" not in slugs
        assert set(slugs) == {"prompting-para-docentes", "ia-intermedia"}

    def test_a_card_carries_what_it_needs_to_render(self, catalog_client: TestClient) -> None:
        item = next(
            course
            for course in catalog_client.get(COURSES).json()["items"]
            if course["slug"] == "prompting-para-docentes"
        )

        assert item["title"] == "Prompting para docentes"
        assert item["instructor_name"] == "Eduardo Calvache"
        assert item["lesson_count"] == 3
        assert item["duration_seconds"] == 360

    def test_filters_by_level(self, catalog_client: TestClient) -> None:
        response = catalog_client.get(COURSES, params={"level": "intermediate"})

        assert [item["slug"] for item in response.json()["items"]] == ["ia-intermedia"]

    def test_rejects_a_level_that_does_not_exist(self, catalog_client: TestClient) -> None:
        response = catalog_client.get(COURSES, params={"level": "imposible"})

        assert response.status_code == 422

    def test_searches_by_text(self, catalog_client: TestClient) -> None:
        response = catalog_client.get(COURSES, params={"q": "prompting"})

        assert [item["slug"] for item in response.json()["items"]] == ["prompting-para-docentes"]

    def test_rejects_a_limit_above_the_maximum(self, catalog_client: TestClient) -> None:
        assert catalog_client.get(COURSES, params={"limit": 500}).status_code == 422

    def test_walks_pages_with_the_cursor(self, catalog_client: TestClient) -> None:
        first = catalog_client.get(COURSES, params={"limit": 1}).json()

        assert first["next_cursor"]

        second = catalog_client.get(
            COURSES, params={"limit": 1, "cursor": first["next_cursor"]}
        ).json()

        assert second["items"][0]["slug"] != first["items"][0]["slug"]
        assert second["next_cursor"] is None

    def test_rejects_a_tampered_cursor(self, catalog_client: TestClient) -> None:
        response = catalog_client.get(COURSES, params={"cursor": "no-es-un-cursor!!"})

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_cursor"


class TestDetail:
    def test_returns_the_syllabus(self, catalog_client: TestClient) -> None:
        response = catalog_client.get(f"{COURSES}/prompting-para-docentes")

        assert response.status_code == 200
        body = response.json()
        assert body["description"]
        assert len(body["modules"][0]["lessons"]) == 3

    def test_lessons_come_back_ordered(self, catalog_client: TestClient) -> None:
        body = catalog_client.get(f"{COURSES}/prompting-para-docentes").json()

        positions = [lesson["position"] for lesson in body["modules"][0]["lessons"]]
        assert positions == sorted(positions)

    def test_an_unknown_slug_is_404(self, catalog_client: TestClient) -> None:
        response = catalog_client.get(f"{COURSES}/no-existe")

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "course_not_found"

    def test_a_draft_answers_exactly_like_a_missing_course(
        self, catalog_client: TestClient
    ) -> None:
        # Same status and same code, so the endpoint cannot be used to discover
        # unpublished work by probing slugs.
        missing = catalog_client.get(f"{COURSES}/no-existe")
        draft = catalog_client.get(f"{COURSES}/borrador-oculto")

        assert draft.status_code == missing.status_code == 404
        assert draft.json()["error"]["code"] == missing.json()["error"]["code"]
