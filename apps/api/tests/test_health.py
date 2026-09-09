"""Liveness and readiness.

They answer different questions, and an orchestrator does different things with
the answers. Conflating them is how a database blip becomes a restart loop
across every replica at once.
"""

from fastapi.testclient import TestClient


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
