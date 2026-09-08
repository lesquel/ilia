"""HTTP-level tests for the auth endpoints.

The point of this file is the dual credential transport (TRD 4.5): the same use
cases must hand a browser an httpOnly cookie and a native app a bearer token,
and must never hand a browser something the page can read.
"""

from fastapi.testclient import TestClient

WEB = {"X-Client-Platform": "web"}
NATIVE = {"X-Client-Platform": "native"}

ACCOUNT = {
    "email": "docente@colegio.edu",
    "full_name": "Ana Pérez",
    "password": "una-clave-larga",
}


def register(client: TestClient, headers: dict[str, str], **overrides: str):  # type: ignore[no-untyped-def]
    return client.post("/api/v1/auth/register", json={**ACCOUNT, **overrides}, headers=headers)


class TestRegistration:
    def test_creates_the_account(self, client: TestClient) -> None:
        response = register(client, WEB)

        assert response.status_code == 201
        assert response.json()["user"]["email"] == "docente@colegio.edu"

    def test_new_accounts_are_students(self, client: TestClient) -> None:
        assert register(client, WEB).json()["user"]["role"] == "student"

    def test_a_duplicate_address_is_a_conflict(self, client: TestClient) -> None:
        register(client, WEB)

        response = register(client, WEB)

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "email_already_registered"

    def test_a_short_password_is_rejected_before_any_use_case_runs(
        self, client: TestClient
    ) -> None:
        response = register(client, WEB, password="corta")

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "schema_error"


class TestWebTransport:
    def test_the_browser_gets_httponly_cookies(self, client: TestClient) -> None:
        response = register(client, WEB)

        cookies = response.headers.get_list("set-cookie")
        assert any("ilia_session=" in c and "HttpOnly" in c for c in cookies)
        assert any("ilia_refresh=" in c and "HttpOnly" in c for c in cookies)

    def test_the_browser_never_receives_a_readable_token(self, client: TestClient) -> None:
        # The whole reason for the cookie. A token in this body would sit in JS
        # memory, which is exactly what an XSS payload can reach.
        body = register(client, WEB).json()

        assert body["access_token"] is None
        assert body["refresh_token"] is None

    def test_the_refresh_cookie_is_scoped_to_the_refresh_endpoint(self, client: TestClient) -> None:
        # A cookie that is not sent with every request cannot be replayed by
        # every request.
        cookies = register(client, WEB).headers.get_list("set-cookie")

        refresh_cookie = next(c for c in cookies if "ilia_refresh=" in c)
        assert "Path=/api/v1/auth/refresh" in refresh_cookie

    def test_the_cookie_authenticates_the_next_request(self, client: TestClient) -> None:
        register(client, WEB)

        response = client.get("/api/v1/auth/me")

        assert response.status_code == 200
        assert response.json()["email"] == "docente@colegio.edu"

    def test_logout_clears_the_cookies(self, client: TestClient) -> None:
        register(client, WEB)

        client.post("/api/v1/auth/logout")

        assert client.get("/api/v1/auth/me").status_code == 401


class TestNativeTransport:
    def test_the_app_gets_tokens_in_the_body(self, client: TestClient) -> None:
        body = register(client, NATIVE).json()

        assert body["access_token"]
        assert body["refresh_token"]
        assert body["expires_in"] > 0

    def test_the_app_gets_no_cookies(self, client: TestClient) -> None:
        response = register(client, NATIVE)

        assert not response.headers.get_list("set-cookie")

    def test_the_bearer_token_authenticates(self, client: TestClient) -> None:
        token = register(client, NATIVE).json()["access_token"]

        response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200

    def test_an_unknown_platform_header_is_treated_as_web(self, client: TestClient) -> None:
        # Fail safe: if a proxy drops the header, issue a cookie a native client
        # ignores rather than hand a browser a readable token.
        body = register(client, {"X-Client-Platform": "toaster"}).json()

        assert body["access_token"] is None


class TestLogin:
    def test_accepts_the_right_password(self, client: TestClient) -> None:
        register(client, NATIVE)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": ACCOUNT["email"], "password": ACCOUNT["password"]},
            headers=NATIVE,
        )

        assert response.status_code == 200
        assert response.json()["access_token"]

    def test_a_wrong_password_is_401_and_says_nothing_useful(self, client: TestClient) -> None:
        register(client, NATIVE)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": ACCOUNT["email"], "password": "incorrecta"},
            headers=NATIVE,
        )

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_credentials"

    def test_an_unknown_account_answers_identically(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "nadie@colegio.edu", "password": "una-clave-larga"},
            headers=NATIVE,
        )

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_credentials"


class TestRefresh:
    def test_the_web_client_refreshes_with_its_cookie_alone(self, client: TestClient) -> None:
        register(client, WEB)

        response = client.post("/api/v1/auth/refresh")

        assert response.status_code == 200
        assert response.json()["access_token"] is None

    def test_the_native_client_refreshes_with_the_token_in_the_body(
        self, client: TestClient
    ) -> None:
        refresh_token = register(client, NATIVE).json()["refresh_token"]

        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
            headers=NATIVE,
        )

        assert response.status_code == 200
        assert response.json()["access_token"]

    def test_refreshing_without_any_token_is_401(self, client: TestClient) -> None:
        response = client.post("/api/v1/auth/refresh", headers=NATIVE)

        assert response.status_code == 401

    def test_an_access_token_is_not_accepted_as_a_refresh_token(self, client: TestClient) -> None:
        access_token = register(client, NATIVE).json()["access_token"]

        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token},
            headers=NATIVE,
        )

        assert response.status_code == 401


class TestProtectedRoute:
    def test_requires_credentials(self, client: TestClient) -> None:
        response = client.get("/api/v1/auth/me")

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_token"

    def test_rejects_a_token_signed_with_another_key(self, client: TestClient) -> None:
        response = client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )

        assert response.status_code == 401
