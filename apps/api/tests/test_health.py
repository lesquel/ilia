from fastapi.testclient import TestClient

from app.main import create_app


def test_health_reports_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_every_response_carries_a_correlation_id() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.headers["X-Request-Id"]


def test_correlation_id_is_echoed_when_the_caller_supplies_one() -> None:
    client = TestClient(create_app())

    response = client.get("/health", headers={"X-Request-Id": "abc-123"})

    assert response.headers["X-Request-Id"] == "abc-123"


def test_unknown_route_uses_the_uniform_error_envelope() -> None:
    client = TestClient(create_app())

    response = client.get("/nope")

    assert response.status_code == 404
    assert set(response.json()["error"]) == {"code", "message", "detail"}
