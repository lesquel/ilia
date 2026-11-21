"""The delegated credential cannot become a general ILIA access token."""

from datetime import UTC, datetime
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.auth.domain.entities import Role
from app.main import create_app

KEY = "independent-integration-fixture-secret-123456"
BASE = "/api/v1/auth/code-module"
ACCOUNT = {"email": "real@example.org", "full_name": "Docente Real", "password": "Prueba-segura1!"}


@pytest.fixture
def module_client(settings: Settings) -> TestClient:
    settings.code_module_shared_secret = KEY
    return TestClient(create_app(settings))


def register(client: TestClient):
    response = client.post("/api/v1/auth/register", json=ACCOUNT)
    assert response.status_code == 201
    return next(iter(client.app.state.auth["users"]._by_id.values()))


def ticket(client: TestClient):
    return client.post(BASE + "/ticket", headers={"Origin": "http://localhost:8081"})


def exchange(client: TestClient, token: str):
    return client.post(BASE + "/exchange", json={"ticket": token}, headers={"X-Module-Key": KEY})


def identity(client: TestClient, token: str):
    return client.get(
        BASE + "/identity", headers={"X-Module-Key": KEY, "Authorization": "Bearer " + token}
    )


@pytest.mark.parametrize("role", list(Role))
def test_real_identity_role_and_distinct_credentials(module_client: TestClient, role: Role):
    user = register(module_client)
    user.role = role
    issued = ticket(module_client)
    assert issued.status_code == 200
    assert issued.headers["cache-control"] == "no-store"
    data = issued.json()
    decoded = jwt.decode(data["ticket"], KEY, algorithms=["HS256"], audience="ilia-entregas-codigo")
    assert decoded["kind"] == "handoff"
    assert decoded["exp"] - decoded["iat"] <= 60
    assert "email" not in decoded and "password" not in decoded
    result = exchange(module_client, data["ticket"])
    assert result.status_code == 200
    session = result.json()
    assert session["user"]["id"] == str(user.id)
    assert session["user"]["role"] == role.value
    assert result.headers["cache-control"] == "no-store"
    assert identity(module_client, session["session_token"]).status_code == 200
    assert identity(module_client, data["ticket"]).status_code == 401
    assert exchange(module_client, session["session_token"]).status_code == 401
    # A delegated token cannot authenticate at the platform's ordinary endpoints.
    assert (
        module_client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer " + session["session_token"]}
        ).status_code
        == 401
    )


def test_disabled_integration_preserves_normal_auth(client: TestClient):
    register(client)
    assert ticket(client).status_code == 503
    assert client.get("/api/v1/auth/me").status_code == 200


def test_requires_session_allowed_origin_and_service_key(module_client: TestClient):
    assert ticket(module_client).status_code == 401
    register(module_client)
    assert (
        module_client.post(BASE + "/ticket", headers={"Origin": "https://foreign.test"}).status_code
        == 403
    )
    issued = ticket(module_client).json()["ticket"]
    assert module_client.post(BASE + "/exchange", json={"ticket": issued}).status_code == 401
    assert (
        module_client.post(
            BASE + "/exchange", json={"ticket": issued}, headers={"X-Module-Key": "wrong"}
        ).status_code
        == 401
    )


def test_fresh_roles_deactivation_and_generation(module_client: TestClient):
    user = register(module_client)
    session = exchange(module_client, ticket(module_client).json()["ticket"]).json()[
        "session_token"
    ]
    user.role = Role.INSTRUCTOR
    assert identity(module_client, session).json()["user"]["role"] == "instructor"
    user.is_active = False
    assert identity(module_client, session).status_code == 401
    user.is_active = True
    user.token_generation += 1
    assert identity(module_client, session).status_code == 401
    assert ticket(module_client).status_code == 401


def test_expired_tampered_foreign_audience_and_removed_accounts(module_client: TestClient):
    user = register(module_client)
    issued = ticket(module_client).json()["ticket"]
    claims = jwt.decode(issued, KEY, algorithms=["HS256"], audience="ilia-entregas-codigo")
    now = int(datetime.now(UTC).timestamp())
    for changes in (
        {"exp": now - 1},
        {"aud": "different"},
        {"kind": "session"},
        {"jti": "invalid"},
    ):
        bad = jwt.encode({**claims, **changes}, KEY, algorithm="HS256")
        assert exchange(module_client, bad).status_code == 401
    assert exchange(module_client, issued[:-10] + "tamperedxx").status_code == 401
    module_client.app.state.auth["users"]._by_id.pop(user.id)
    assert exchange(module_client, issued).status_code == 401


def test_correlation_is_propagated_and_no_tokens_in_logs(module_client: TestClient, capsys):
    register(module_client)
    correlation = str(uuid4())
    issued = module_client.post(
        BASE + "/ticket", headers={"Origin": "http://localhost:8081", "X-Request-Id": correlation}
    )
    assert issued.json()["correlation_id"] == correlation
    result = module_client.post(
        BASE + "/exchange",
        json={"ticket": issued.json()["ticket"]},
        headers={"X-Module-Key": KEY, "X-Request-Id": correlation},
    )
    assert result.json()["correlation_id"] == correlation
    output = capsys.readouterr().out
    assert issued.json()["ticket"] not in output
    assert result.json()["session_token"] not in output
    assert KEY not in output
