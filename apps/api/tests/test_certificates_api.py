"""Certificate endpoints.

Two rules this file defends: verification is public and reveals almost nothing,
and only an admin can revoke.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.auth.domain.entities import Role
from app.features.catalog.domain.entities import Slug
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.certificates.infrastructure.memory_repository import (
    InMemoryCertificateRepository,
    StubActivityResults,
)
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryProgressRepository,
)
from app.main import create_app
from tests.test_catalog_use_cases import make_course

NATIVE = {"X-Client-Platform": "native"}
CERTS = "/api/v1/certificates"
ENROLLMENTS = "/api/v1/enrollments"


@pytest.fixture
def app(settings: Settings):  # type: ignore[no-untyped-def]
    application = create_app(settings)
    application.state.catalog["courses"] = InMemoryCourseRepository(
        [make_course("ia-basica", lessons=2)]
    )
    application.state.enrollment["enrollments"] = InMemoryEnrollmentRepository()
    application.state.enrollment["progress"] = InMemoryProgressRepository()
    application.state.enrollment["cohorts"] = InMemoryCohortRepository()
    application.state.certificates["certificates"] = InMemoryCertificateRepository()
    # No activities in this course, so the criteria come down to the lessons.
    application.state.certificates["results"] = StubActivityResults(total=0, passed=0)
    return application


@pytest.fixture
def client(app) -> TestClient:  # type: ignore[no-untyped-def]
    return TestClient(app)


def register(client: TestClient, email: str = "ana@colegio.edu") -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Ana Pérez", "password": "Una-clave-larga1!"},
        headers=NATIVE,
    )
    return response.json()["access_token"]  # type: ignore[no-any-return]


def auth(token: str) -> dict[str, str]:
    return {**NATIVE, "Authorization": f"Bearer {token}"}


def lesson_ids(app, slug: str = "ia-basica") -> list[str]:  # type: ignore[no-untyped-def]
    course = next(item for item in app.state.catalog["courses"]._courses if item.slug == Slug(slug))
    return [
        str(lesson.id) for module in course.ordered_modules for lesson in module.ordered_lessons
    ]


def finish_course(client: TestClient, app, token: str) -> None:  # type: ignore[no-untyped-def]
    client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))
    for lesson_id in lesson_ids(app):
        client.post(f"{ENROLLMENTS}/me/ia-basica/lessons/{lesson_id}/complete", headers=auth(token))


class TestEligibility:
    def test_a_fresh_enrollment_is_not_eligible_and_says_why(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        body = client.get(f"{CERTS}/eligibility/ia-basica", headers=auth(token)).json()

        assert body["met"] is False
        assert body["missing"]

    def test_finishing_the_course_makes_it_eligible(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        finish_course(client, app, token)

        body = client.get(f"{CERTS}/eligibility/ia-basica", headers=auth(token)).json()

        assert body["met"] is True
        assert body["missing"] == []


class TestIssuing:
    def test_issuing_before_finishing_is_refused_with_the_reasons(self, client: TestClient) -> None:
        token = register(client)
        client.post(ENROLLMENTS, json={"course_slug": "ia-basica"}, headers=auth(token))

        response = client.post(f"{CERTS}/ia-basica", headers=auth(token))

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "criteria_not_met"
        assert response.json()["error"]["detail"]["missing"]

    def test_issuing_after_finishing_works(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        finish_course(client, app, token)

        response = client.post(f"{CERTS}/ia-basica", headers=auth(token))

        assert response.status_code == 201
        assert response.json()["status"] == "valid"
        assert response.json()["holder_name"] == "Ana Pérez"

    def test_issuing_twice_returns_the_same_certificate(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # Two codes for one achievement is two things to verify and one to
        # explain.
        token = register(client)
        finish_course(client, app, token)

        first = client.post(f"{CERTS}/ia-basica", headers=auth(token)).json()
        second = client.post(f"{CERTS}/ia-basica", headers=auth(token)).json()

        assert first["code"] == second["code"]

    def test_it_then_appears_in_my_certificates(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = register(client)
        finish_course(client, app, token)
        client.post(f"{CERTS}/ia-basica", headers=auth(token))

        mine = client.get(f"{CERTS}/me", headers=auth(token)).json()

        assert len(mine) == 1

    def test_a_stub_score_is_refused_even_when_the_activity_looks_passed(
        self, client: TestClient, app
    ) -> None:  # type: ignore[no-untyped-def]
        # The client already hides the card. The API must not mint a code from
        # local-stub notes — a teacher (or a curl) would still walk away with
        # a credential that cannot be defended.
        app.state.certificates["results"] = StubActivityResults(
            total=1, passed=1, simulated_passed=1
        )
        token = register(client)
        finish_course(client, app, token)

        response = client.post(f"{CERTS}/ia-basica", headers=auth(token))

        assert response.status_code == 409
        assert response.json()["error"]["code"] == "criteria_not_met"
        missing = response.json()["error"]["detail"]["missing"]
        assert any("simuladas" in reason for reason in missing)

    def test_eligibility_names_the_stub_instead_of_calling_it_a_pass(
        self, client: TestClient, app
    ) -> None:  # type: ignore[no-untyped-def]
        app.state.certificates["results"] = StubActivityResults(
            total=1, passed=1, simulated_passed=1
        )
        token = register(client)
        finish_course(client, app, token)

        body = client.get(f"{CERTS}/eligibility/ia-basica", headers=auth(token)).json()

        assert body["met"] is False
        assert any("simuladas" in reason for reason in body["missing"])


class TestPublicVerification:
    def test_it_needs_no_account(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # The whole value of the certification: a school or the Alcaldía can
        # check it without signing up (PRD 8).
        token = register(client)
        finish_course(client, app, token)
        code = client.post(f"{CERTS}/ia-basica", headers=auth(token)).json()["code"]

        response = client.get(f"{CERTS}/verify/{code}")

        assert response.status_code == 200
        assert response.json()["valid"] is True

    def test_it_reveals_only_what_the_holder_chose_to_share(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # Verifying a certificate must not become a way to look someone up.
        token = register(client)
        finish_course(client, app, token)
        code = client.post(f"{CERTS}/ia-basica", headers=auth(token)).json()["code"]

        body = client.get(f"{CERTS}/verify/{code}").json()

        assert set(body) == {
            "valid",
            "status",
            "holder_name",
            "course_title",
            "issued_at",
            "revoked_reason",
        }
        assert "colegio.edu" not in str(body)

    def test_the_hyphenated_form_is_accepted(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # Whoever types it will type the hyphens they were shown.
        token = register(client)
        finish_course(client, app, token)
        code = client.post(f"{CERTS}/ia-basica", headers=auth(token)).json()["code"]

        assert "-" in code
        assert client.get(f"{CERTS}/verify/{code.replace('-', '')}").status_code == 200

    def test_an_unknown_code_is_404(self, client: TestClient) -> None:
        assert client.get(f"{CERTS}/verify/ABCD2345EFGH").status_code == 404

    def test_a_malformed_code_answers_exactly_like_an_unknown_one(self, client: TestClient) -> None:
        malformed = client.get(f"{CERTS}/verify/no-es-un-codigo")
        unknown = client.get(f"{CERTS}/verify/ABCD2345EFGH")

        assert malformed.status_code == unknown.status_code == 404
        assert malformed.json()["error"]["code"] == unknown.json()["error"]["code"]


class TestRevocation:
    def issue_one(self, client: TestClient, app) -> tuple[str, str]:  # type: ignore[no-untyped-def]
        token = register(client)
        finish_course(client, app, token)
        body = client.post(f"{CERTS}/ia-basica", headers=auth(token)).json()
        return body["id"], body["code"]

    def test_a_student_cannot_revoke(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        certificate_id, _ = self.issue_one(client, app)
        token = register(client, "otra@colegio.edu")

        response = client.post(
            f"{CERTS}/{certificate_id}/revoke",
            json={"reason": "porque sí"},
            headers=auth(token),
        )

        assert response.status_code == 403

    def test_revoking_needs_a_reason(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        certificate_id, _ = self.issue_one(client, app)
        admin_token = self.make_admin(client, app)

        response = client.post(
            f"{CERTS}/{certificate_id}/revoke", json={"reason": ""}, headers=auth(admin_token)
        )

        assert response.status_code == 422

    def test_an_admin_can_revoke_and_verification_then_fails(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # PRD A-04: the revoked certificate must fail public verification.
        certificate_id, code = self.issue_one(client, app)
        admin_token = self.make_admin(client, app)

        client.post(
            f"{CERTS}/{certificate_id}/revoke",
            json={"reason": "Emitido por error administrativo"},
            headers=auth(admin_token),
        )

        body = client.get(f"{CERTS}/verify/{code}").json()
        assert body["valid"] is False
        assert body["status"] == "revoked"
        # And it says why, rather than leaving the holder assumed guilty of
        # something unspecified.
        assert body["revoked_reason"] == "Emitido por error administrativo"

    def test_revoking_twice_is_a_conflict(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        certificate_id, _ = self.issue_one(client, app)
        admin_token = self.make_admin(client, app)
        payload = {"reason": "Emitido por error"}

        client.post(f"{CERTS}/{certificate_id}/revoke", json=payload, headers=auth(admin_token))
        second = client.post(
            f"{CERTS}/{certificate_id}/revoke", json=payload, headers=auth(admin_token)
        )

        assert second.status_code == 409

    @staticmethod
    def make_admin(client: TestClient, app) -> str:  # type: ignore[no-untyped-def]
        """Register an account and promote it.

        There is no self-service path to admin — the role is changed directly in
        the repository, which is exactly the point (PRD A-02).
        """
        token = register(client, "admin@ilia.app")
        users = app.state.auth["users"]
        for user in users._by_id.values():
            if str(user.email) == "admin@ilia.app":
                user.role = Role.ADMIN
        return token

    def test_an_admin_can_find_a_certificate_by_its_code(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        """Revocation needs an id, and this is the only way to get one.

        The public verification endpoint deliberately omits the id and the
        per-user listing only shows your own, so without this lookup the revoke
        endpoint cannot be reached by the admin the PRD assigns it to.
        """
        certificate_id, code = self.issue_one(client, app)
        admin_token = self.make_admin(client, app)

        found = client.get(f"{CERTS}/lookup", params={"code": code}, headers=auth(admin_token))

        assert found.status_code == 200
        assert found.json()["id"] == certificate_id

        # And that id revokes, closing the loop.
        revoked = client.post(
            f"{CERTS}/{certificate_id}/revoke",
            json={"reason": "Emitido por error"},
            headers=auth(admin_token),
        )
        assert revoked.status_code == 200

    def test_the_lookup_is_not_open_to_everyone(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # An open lookup would be an enumeration oracle, and it answers with
        # more than "is this valid".
        _, code = self.issue_one(client, app)
        token = register(client, "curiosa@colegio.edu")

        assert client.get(f"{CERTS}/lookup", params={"code": code}).status_code == 401
        assert (
            client.get(f"{CERTS}/lookup", params={"code": code}, headers=auth(token)).status_code
            == 403
        )

    def test_an_unknown_or_malformed_code_answers_the_same_way(
        self, client: TestClient, app
    ) -> None:  # type: ignore[no-untyped-def]
        admin_token = self.make_admin(client, app)

        unknown = client.get(
            f"{CERTS}/lookup", params={"code": "ABCD-EFGH-JKMN"}, headers=auth(admin_token)
        )
        malformed = client.get(
            f"{CERTS}/lookup", params={"code": "no-es-un-codigo"}, headers=auth(admin_token)
        )

        assert unknown.status_code == 404
        assert malformed.status_code == 404

    def test_revoking_is_written_to_the_audit_log(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        """The product tells the admin the revocation "queda auditada".

        Before this, it only reached the application log — so the claim was
        true for whoever could read the server's stdout and false for the admin
        reading the audit screen. Invalidating someone's credential has to be
        answerable inside the product.
        """
        certificate_id, code = self.issue_one(client, app)
        admin_token = self.make_admin(client, app)

        client.post(
            f"{CERTS}/{certificate_id}/revoke",
            json={"reason": "Emitido por error administrativo"},
            headers=auth(admin_token),
        )

        page = client.get("/api/v1/admin/audit", headers=auth(admin_token)).json()
        revocations = [e for e in page["items"] if e["action"] == "certificate_revoked"]

        assert len(revocations) == 1
        detail = revocations[0]["detail"]
        assert detail["code"] == code
        # The reason travels with it: an audit entry that records the act but
        # not the justification does not answer the question anyone will ask.
        assert detail["reason"] == "Emitido por error administrativo"
