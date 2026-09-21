"""Liveness and readiness.

They answer different questions, and an orchestrator does different things with
the answers. Conflating them is how a database blip becomes a restart loop
across every replica at once.
"""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


class TestLiveness:
    def test_it_answers_without_a_database(self, client: TestClient) -> None:
        # Liveness must not depend on anything: a process that is alive but
        # cannot reach the database should be taken out of rotation, not killed.
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestReadiness:
    def test_without_a_database_it_reports_degraded(self, client: TestClient) -> None:
        # In-memory repositories forget everything on restart. Calling that
        # "ready" would hide it from whoever is watching the deploy.
        response = client.get("/health/ready")

        assert response.status_code == 503
        assert response.json()["database"] == "unconfigured"

    def test_it_names_the_providers_without_leaking_their_keys(self, client: TestClient) -> None:
        """How you notice a deployment that is not really grading anything.

        `local-stub` here means submissions are being answered by a placeholder,
        which is invisible from every other endpoint.
        """
        body = client.get("/health/ready").json()

        assert body["llm"] == "local-stub"
        assert body["storage"] == "local"
        assert "key" not in str(body).lower()

    def test_a_configured_provider_is_named_instead_of_the_stub(self, settings: Settings) -> None:
        """How an operator proves the wiring without grading a teacher.

        `/health/ready` reports the provider name, never the key. Seeing
        anything other than `local-stub` is the check; a live lab against a
        paid API is not.
        """
        configured = settings.model_copy(
            update={"llm_provider": "anthropic", "llm_api_key": "not-a-real-key"}
        )
        body = TestClient(create_app(configured)).get("/health/ready").json()

        assert body["llm"] == "anthropic"
        assert body["llm"] != "local-stub"
        assert "not-a-real-key" not in str(body)

    def test_whitespace_only_provider_still_reports_the_stub(self, settings: Settings) -> None:
        """A blank `ILIA_LLM_PROVIDER` is the stub, same as unset.

        Readiness used to echo the raw string. `" "` is not `local-stub`, so
        the documented operator check would pass while evaluation still
        graded nothing.
        """
        configured = settings.model_copy(update={"llm_provider": " "})
        body = TestClient(create_app(configured)).get("/health/ready").json()

        assert body["llm"] == "local-stub"

    def test_a_padded_provider_name_is_the_one_evaluation_selected(
        self, settings: Settings
    ) -> None:
        configured = settings.model_copy(
            update={"llm_provider": " Anthropic ", "llm_api_key": "not-a-real-key"}
        )
        body = TestClient(create_app(configured)).get("/health/ready").json()

        assert body["llm"] == "anthropic"
