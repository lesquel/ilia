"""HTTP-level tests for the auth endpoints.

The point of this file is the dual credential transport (TRD 4.5): the same use
cases must hand a browser an httpOnly cookie and a native app a bearer token,
and must never hand a browser something the page can read.
"""

from fastapi.testclient import TestClient

from app.features.auth.domain.entities import Email, Role
from app.features.auth.infrastructure.memory_repository import InMemoryUserRepository

WEB = {"X-Client-Platform": "web"}
NATIVE = {"X-Client-Platform": "native"}

ACCOUNT = {
    "email": "docente@colegio.edu",
    "full_name": "Ana Pérez",
    "password": "una-clave-larga",
}


def register(client: TestClient, headers: dict[str, str], **overrides: str):  # type: ignore[no-untyped-def]
    return client.post("/api/v1/auth/register", json={**ACCOUNT, **overrides}, headers=headers)


def set_role(client: TestClient, email: str, role: Role) -> None:
    repo = client.app.state.auth["users"]
    assert isinstance(repo, InMemoryUserRepository)
    for user in repo._by_id.values():
        if user.email == Email(email):
            user.role = role
            return
    raise AssertionError(f"user {email} not found")


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


class TestChangePassword:
    """Changing your own password, and what that has to end.

    There is no reset-by-email flow yet, so this is the only way a teacher can
    replace a password they think someone else has seen.
    """

    def bearer(self, token: str) -> dict[str, str]:
        return {**NATIVE, "Authorization": f"Bearer {token}"}

    def test_a_session_is_required(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/auth/password",
            json={"current_password": "una-clave-larga", "new_password": "otra-clave-larga"},
            headers=NATIVE,
        )

        assert response.status_code == 401

    def test_the_current_password_is_required(self, client: TestClient) -> None:
        # A session alone is not enough. Somebody who walked up to an unlocked
        # laptop would otherwise take the account for good.
        token = register(client, NATIVE).json()["access_token"]

        response = client.post(
            "/api/v1/auth/password",
            json={"current_password": "no-es-la-mia", "new_password": "otra-clave-larga"},
            headers=self.bearer(token),
        )

        assert response.status_code == 401

    def test_a_short_new_password_is_rejected(self, client: TestClient) -> None:
        token = register(client, NATIVE).json()["access_token"]

        response = client.post(
            "/api/v1/auth/password",
            json={"current_password": "una-clave-larga", "new_password": "corta"},
            headers=self.bearer(token),
        )

        assert response.status_code == 422

    def test_reusing_the_same_password_is_refused(self, client: TestClient) -> None:
        # Accepting it would end every other session while leaving the password
        # an intruder already knows.
        token = register(client, NATIVE).json()["access_token"]

        response = client.post(
            "/api/v1/auth/password",
            json={"current_password": "una-clave-larga", "new_password": "una-clave-larga"},
            headers=self.bearer(token),
        )

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "same_password"

    def test_the_new_password_works_and_the_old_one_stops(self, client: TestClient) -> None:
        token = register(client, NATIVE).json()["access_token"]

        changed = client.post(
            "/api/v1/auth/password",
            json={"current_password": "una-clave-larga", "new_password": "una-clave-nueva"},
            headers=self.bearer(token),
        )
        assert changed.status_code == 204

        login = {"email": ACCOUNT["email"]}
        assert (
            client.post(
                "/api/v1/auth/login",
                json={**login, "password": "una-clave-nueva"},
                headers=NATIVE,
            ).status_code
            == 200
        )
        assert (
            client.post(
                "/api/v1/auth/login",
                json={**login, "password": "una-clave-larga"},
                headers=NATIVE,
            ).status_code
            == 401
        )

    def test_other_sessions_stop_refreshing(self, client: TestClient) -> None:
        """The whole reason the feature exists.

        Someone changing their password because they think another person has
        it must not leave that person signed in. Access tokens are short-lived;
        the refresh token is the one that would keep an intruder in for thirty
        days, so that is the one this has to kill.
        """
        first = register(client, NATIVE).json()
        intruder_refresh = first["refresh_token"]

        # A second session, which is the one doing the change.
        second = client.post(
            "/api/v1/auth/login",
            json={"email": ACCOUNT["email"], "password": "una-clave-larga"},
            headers=NATIVE,
        ).json()

        # Before the change, the first session refreshes fine.
        assert (
            client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": intruder_refresh},
                headers=NATIVE,
            ).status_code
            == 200
        )

        client.post(
            "/api/v1/auth/password",
            json={"current_password": "una-clave-larga", "new_password": "una-clave-nueva"},
            headers=self.bearer(second["access_token"]),
        )

        refused = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": intruder_refresh},
            headers=NATIVE,
        )
        assert refused.status_code == 401

    def test_the_session_doing_the_change_keeps_working(self, client: TestClient) -> None:
        # The person is at the keyboard fixing a compromise. Signing them out of
        # the browser they are using to fix it punishes the wrong person.
        session = register(client, WEB)
        changed = client.post(
            "/api/v1/auth/password",
            json={"current_password": "una-clave-larga", "new_password": "una-clave-nueva"},
            headers=WEB,
        )

        assert changed.status_code == 204
        assert "set-cookie" in {k.lower() for k in changed.headers}
        assert client.get("/api/v1/auth/me", headers=WEB).status_code == 200
        assert session.status_code == 201


class TestPasswordReset:
    def test_request_always_returns_empty(self, client: TestClient) -> None:
        register(client, WEB)

        known = client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": ACCOUNT["email"]},
            headers=WEB,
        )
        unknown = client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "nadie@colegio.edu"},
            headers=WEB,
        )

        assert known.status_code == 204
        assert unknown.status_code == 204

    def test_issue_requires_instructor(self, client: TestClient) -> None:
        register(client, NATIVE)
        token = register(
            client,
            NATIVE,
            email="instr@colegio.edu",
            full_name="Instr",
        ).json()["access_token"]

        refused = client.post(
            "/api/v1/auth/password-reset/issue",
            json={"email": ACCOUNT["email"]},
            headers={**NATIVE, "Authorization": f"Bearer {token}"},
        )
        assert refused.status_code == 403

    def test_teacher_can_reset_with_assisted_token(self, client: TestClient) -> None:
        register(client, WEB)
        register(client, NATIVE, email="instr@ilia.edu", full_name="Instr")
        set_role(client, "instr@ilia.edu", Role.INSTRUCTOR)

        instr_login = client.post(
            "/api/v1/auth/login",
            json={"email": "instr@ilia.edu", "password": "una-clave-larga"},
            headers=NATIVE,
        )
        instr_token = instr_login.json()["access_token"]

        issued = client.post(
            "/api/v1/auth/password-reset/issue",
            json={"email": ACCOUNT["email"]},
            headers={**NATIVE, "Authorization": f"Bearer {instr_token}"},
        )
        assert issued.status_code == 200
        reset_token = issued.json()["reset_token"]

        confirmed = client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"reset_token": reset_token, "new_password": "clave-nueva-larga"},
            headers=WEB,
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["user"]["email"] == ACCOUNT["email"]

        login_old = client.post(
            "/api/v1/auth/login",
            json={"email": ACCOUNT["email"], "password": ACCOUNT["password"]},
            headers=WEB,
        )
        assert login_old.status_code == 401

        login_new = client.post(
            "/api/v1/auth/login",
            json={"email": ACCOUNT["email"], "password": "clave-nueva-larga"},
            headers=WEB,
        )
        assert login_new.status_code == 200
