"""Forum endpoints (PRD E-07).

Three rules this file defends: the forum belongs to the people in the course,
threads cannot be read across courses, and moderation is scoped to whoever
actually owns the course.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.auth.domain.entities import Role
from app.features.catalog.infrastructure.memory_repository import InMemoryCourseRepository
from app.features.enrollment.infrastructure.memory_repository import (
    InMemoryCohortRepository,
    InMemoryEnrollmentRepository,
    InMemoryProgressRepository,
)
from app.features.forum.infrastructure.memory_repository import (
    InMemoryPostRepository,
    InMemoryThreadRepository,
)
from app.features.storage.domain.ports import SignedUrl
from app.main import create_app
from tests.test_catalog_use_cases import make_course

NATIVE = {"X-Client-Platform": "native"}
FORUM = "/api/v1/forum"
ENROLLMENTS = "/api/v1/enrollments"

THREAD = {"title": "¿Cómo hago para que no invente datos?", "body": "Probé varias cosas y nada."}


@pytest.fixture
def app(settings: Settings):  # type: ignore[no-untyped-def]
    application = create_app(settings)
    application.state.catalog["courses"] = InMemoryCourseRepository(
        [make_course("ia-basica", lessons=2), make_course("otro-curso", lessons=1)]
    )
    application.state.enrollment["enrollments"] = InMemoryEnrollmentRepository()
    application.state.enrollment["progress"] = InMemoryProgressRepository()
    application.state.enrollment["cohorts"] = InMemoryCohortRepository()
    application.state.forum["threads"] = InMemoryThreadRepository()
    application.state.forum["posts"] = InMemoryPostRepository()
    return application


@pytest.fixture
def client(app) -> TestClient:  # type: ignore[no-untyped-def]
    return TestClient(app)


def register(client: TestClient, email: str = "ana@colegio.edu", name: str = "Ana Pérez") -> str:
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": name, "password": "Una-clave-larga1!"},
        headers=NATIVE,
    ).json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {**NATIVE, "Authorization": f"Bearer {token}"}


def enrolled(client: TestClient, email: str = "ana@colegio.edu", slug: str = "ia-basica") -> str:
    token = register(client, email)
    client.post(ENROLLMENTS, json={"course_slug": slug}, headers=auth(token))
    return token


def promote(app, email: str, role: Role) -> None:  # type: ignore[no-untyped-def]
    for user in app.state.auth["users"]._by_id.values():
        if str(user.email) == email:
            user.role = role


class ForumAvatarStorage:
    provider = "s3"

    def __init__(self) -> None:
        self.reads: list[str] = []

    def read_url(self, reference: str, *, ttl):  # type: ignore[no-untyped-def]
        self.reads.append(reference)
        return SignedUrl(f"https://storage.example/{reference}", int(ttl.total_seconds()))

    def write_url(self, reference: str, *, content_type: str, ttl):  # type: ignore[no-untyped-def]
        return SignedUrl("https://storage.example/upload", int(ttl.total_seconds()))

    async def read_bytes(self, reference: str, *, max_bytes: int) -> bytes:
        return b"\x89PNG\r\n\x1a\npicture"

    async def delete(self, reference: str) -> None:
        return


class TestAccess:
    def test_the_forum_needs_a_session(self, client: TestClient) -> None:
        assert client.get(f"{FORUM}/ia-basica/threads").status_code == 401

    def test_someone_not_enrolled_is_refused(self, client: TestClient) -> None:
        # Permission, not "not found": the course exists and they can see it in
        # the catalog. Pretending otherwise is a lie they can disprove.
        token = register(client)

        response = client.get(f"{FORUM}/ia-basica/threads", headers=auth(token))

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forum_access_denied"

    def test_an_enrolled_teacher_gets_in(self, client: TestClient) -> None:
        token = enrolled(client)

        assert client.get(f"{FORUM}/ia-basica/threads", headers=auth(token)).status_code == 200

    def test_an_instructor_does_not_have_to_enrol_to_moderate(
        self, client: TestClient, app
    ) -> None:  # type: ignore[no-untyped-def]
        # Otherwise they would have to join every course they oversee.
        token = register(client, "eduardo@manta.gob.ec", "Eduardo Calvache")
        promote(app, "eduardo@manta.gob.ec", Role.INSTRUCTOR)

        assert client.get(f"{FORUM}/ia-basica/threads", headers=auth(token)).status_code == 200


class TestThreads:
    def test_opening_a_thread(self, client: TestClient) -> None:
        token = enrolled(client)

        response = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token))

        assert response.status_code == 201
        assert response.json()["title"] == THREAD["title"]
        assert response.json()["author_name"] == "Ana Pérez"
        assert response.json()["reply_count"] == 0

    def test_old_threads_show_the_authors_current_name_and_avatar_without_email(
        self, client: TestClient
    ) -> None:
        token = enrolled(client)
        opened = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token))
        thread_id = opened.json()["id"]
        user = next(iter(client.app.state.auth["users"]._by_id.values()))
        user.avatar_key = "colibri"
        reply_token = enrolled(client, email="responde@colegio.edu")
        reply = client.post(
            f"{FORUM}/ia-basica/threads/{thread_id}/replies",
            json={"body": "Ya probé esa alternativa."},
            headers=auth(reply_token),
        )
        assert reply.status_code == 201
        reply_user = next(
            item
            for item in client.app.state.auth["users"]._by_id.values()
            if str(item.email) == "responde@colegio.edu"
        )
        reply_user.avatar_key = "sol"
        renamed = client.patch(
            "/api/v1/auth/me", json={"full_name": "Ana Docente"}, headers=auth(token)
        )
        assert renamed.status_code == 200
        client.patch(
            "/api/v1/auth/me",
            json={"full_name": "Lucía Colega"},
            headers=auth(reply_token),
        )

        listing = client.get(f"{FORUM}/ia-basica/threads", headers=auth(token)).json()[0]
        detail = client.get(
            f"{FORUM}/ia-basica/threads/{thread_id}", headers=auth(token)
        ).json()

        for author in (listing, detail):
            assert author["author_name"] == "Ana Docente"
            assert author["author_avatar_key"] == "colibri"
            assert "email" not in author
            assert "author_id" not in author
        assert detail["posts"][0]["author_name"] == "Lucía Colega"
        assert detail["posts"][0]["author_avatar_key"] == "sol"

    def test_forum_access_is_checked_before_minting_avatar_urls(
        self, client: TestClient
    ) -> None:
        member_token = enrolled(client)
        author = next(iter(client.app.state.auth["users"]._by_id.values()))
        author.avatar_ref = f"avatars/{author.id}/{'a' * 32}"
        storage = ForumAvatarStorage()
        client.app.state.storage = storage
        client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(member_token))
        storage.reads.clear()
        member_response = client.get(
            f"{FORUM}/ia-basica/threads", headers=auth(member_token)
        )
        assert member_response.status_code == 200
        assert member_response.json()[0]["author_avatar_url"].startswith(
            "https://storage.example/avatars/"
        )
        storage.reads.clear()
        outsider = register(client, "otra@colegio.edu", "Otra Persona")

        response = client.get(
            f"{FORUM}/ia-basica/threads", headers=auth(outsider)
        )

        assert response.status_code == 403
        assert storage.reads == []

    def test_an_empty_body_is_rejected(self, client: TestClient) -> None:
        token = enrolled(client)

        response = client.post(
            f"{FORUM}/ia-basica/threads",
            json={"title": "Hola", "body": "   "},
            headers=auth(token),
        )

        assert response.status_code == 422

    def test_threads_are_listed_most_recently_active_first(self, client: TestClient) -> None:
        # A forum sorted by age buries the conversation people are having.
        token = enrolled(client)
        first = client.post(
            f"{FORUM}/ia-basica/threads",
            json={"title": "Primera", "body": "cuerpo"},
            headers=auth(token),
        ).json()
        client.post(
            f"{FORUM}/ia-basica/threads",
            json={"title": "Segunda", "body": "cuerpo"},
            headers=auth(token),
        )

        client.post(
            f"{FORUM}/ia-basica/threads/{first['id']}/replies",
            json={"body": "una respuesta que la revive"},
            headers=auth(token),
        )

        titles = [
            item["title"]
            for item in client.get(f"{FORUM}/ia-basica/threads", headers=auth(token)).json()
        ]
        assert titles[0] == "Primera"


class TestReplies:
    def test_replying_bumps_the_thread(self, client: TestClient) -> None:
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()

        client.post(
            f"{FORUM}/ia-basica/threads/{thread['id']}/replies",
            json={"body": "Probá pidiéndole que cite las fuentes."},
            headers=auth(token),
        )

        body = client.get(f"{FORUM}/ia-basica/threads/{thread['id']}", headers=auth(token)).json()
        assert body["reply_count"] == 1
        assert len(body["posts"]) == 1

    def test_replies_read_in_the_order_they_happened(self, client: TestClient) -> None:
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()

        for text in ("primera", "segunda", "tercera"):
            client.post(
                f"{FORUM}/ia-basica/threads/{thread['id']}/replies",
                json={"body": text},
                headers=auth(token),
            )

        posts = client.get(f"{FORUM}/ia-basica/threads/{thread['id']}", headers=auth(token)).json()[
            "posts"
        ]
        assert [item["body"] for item in posts] == ["primera", "segunda", "tercera"]

    def test_two_teachers_can_talk_to_each_other(self, client: TestClient) -> None:
        ana = enrolled(client, "ana@colegio.edu")
        luis = enrolled(client, "luis@colegio.edu")
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(ana)).json()

        client.post(
            f"{FORUM}/ia-basica/threads/{thread['id']}/replies",
            json={"body": "A mí me pasó lo mismo."},
            headers=auth(luis),
        )

        posts = client.get(f"{FORUM}/ia-basica/threads/{thread['id']}", headers=auth(ana)).json()[
            "posts"
        ]
        assert posts[0]["author_name"] == "Ana Pérez"


class TestCourseIsolation:
    def test_a_thread_cannot_be_read_through_another_course(self, client: TestClient) -> None:
        # Without the check, any thread id would be readable through any course
        # the caller happens to be enrolled in.
        token = enrolled(client, "ana@colegio.edu", "ia-basica")
        client.post(ENROLLMENTS, json={"course_slug": "otro-curso"}, headers=auth(token))
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()

        response = client.get(f"{FORUM}/otro-curso/threads/{thread['id']}", headers=auth(token))

        assert response.status_code == 404

    def test_listing_one_course_does_not_show_anothers_threads(self, client: TestClient) -> None:
        token = enrolled(client, "ana@colegio.edu", "ia-basica")
        client.post(ENROLLMENTS, json={"course_slug": "otro-curso"}, headers=auth(token))
        client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token))

        assert client.get(f"{FORUM}/otro-curso/threads", headers=auth(token)).json() == []


class TestModeration:
    def test_a_student_cannot_moderate(self, client: TestClient) -> None:
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()

        response = client.post(
            f"{FORUM}/threads/{thread['id']}/hide",
            json={"reason": "no me gusta"},
            headers=auth(token),
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "not_a_moderator"

    def test_an_admin_can_hide_a_thread(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()
        admin = register(client, "admin@ilia.app", "Admin")
        promote(app, "admin@ilia.app", Role.ADMIN)

        response = client.post(
            f"{FORUM}/threads/{thread['id']}/hide",
            json={"reason": "Contiene datos personales de alumnos"},
            headers=auth(admin),
        )

        assert response.status_code == 200
        assert response.json()["is_hidden"] is True

    def test_hiding_needs_a_reason(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()
        admin = register(client, "admin@ilia.app", "Admin")
        promote(app, "admin@ilia.app", Role.ADMIN)

        response = client.post(
            f"{FORUM}/threads/{thread['id']}/hide", json={"reason": ""}, headers=auth(admin)
        )

        assert response.status_code == 422

    def test_a_hidden_reply_is_replaced_not_removed(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        # The shape of the conversation survives, so nobody is left wondering
        # what the reply above them was answering.
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()
        post = client.post(
            f"{FORUM}/ia-basica/threads/{thread['id']}/replies",
            json={"body": "Un mensaje con el nombre de un alumno"},
            headers=auth(token),
        ).json()
        admin = register(client, "admin@ilia.app", "Admin")
        promote(app, "admin@ilia.app", Role.ADMIN)

        client.post(
            f"{FORUM}/posts/{post['id']}/hide",
            json={"reason": "Datos personales"},
            headers=auth(admin),
        )

        posts = client.get(f"{FORUM}/ia-basica/threads/{thread['id']}", headers=auth(token)).json()[
            "posts"
        ]
        assert len(posts) == 1
        assert posts[0]["body"] == "[Mensaje retirado por moderación]"
        assert "alumno" not in posts[0]["body"]

    def test_an_instructor_cannot_moderate_someone_elses_course(
        self, client: TestClient, app
    ) -> None:  # type: ignore[no-untyped-def]
        # The course in this fixture has a random instructor id, so a different
        # instructor account does not own it.
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()
        other = register(client, "otro@instituto.edu", "Otro Instructor")
        promote(app, "otro@instituto.edu", Role.INSTRUCTOR)

        response = client.post(
            f"{FORUM}/threads/{thread['id']}/hide",
            json={"reason": "porque puedo"},
            headers=auth(other),
        )

        assert response.status_code == 403

    def test_can_moderate_matches_who_the_api_actually_lets_moderate(
        self, client: TestClient, app
    ) -> None:  # type: ignore[no-untyped-def]
        """The flag and the rule must never disagree.

        If `can_moderate` said yes to someone the endpoint rejects, the client
        would show a moderation button that 403s; if it said no to someone
        allowed, abusive content would stay up because nobody was offered the
        control.
        """
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()

        # An enrolled teacher: the flag says no, and hiding is refused.
        listed = client.get(f"{FORUM}/ia-basica/threads", headers=auth(token)).json()
        assert listed[0]["can_moderate"] is False
        refused = client.post(
            f"{FORUM}/threads/{thread['id']}/hide",
            json={"reason": "no deberia poder"},
            headers=auth(token),
        )
        assert refused.status_code == 403

        # An admin: the flag says yes, and hiding succeeds.
        admin = register(client, "admin@ministerio.gob", "Admin")
        promote(app, "admin@ministerio.gob", Role.ADMIN)
        as_admin = client.get(f"{FORUM}/ia-basica/threads", headers=auth(admin)).json()
        assert as_admin[0]["can_moderate"] is True
        allowed = client.post(
            f"{FORUM}/threads/{thread['id']}/hide",
            json={"reason": "spam"},
            headers=auth(admin),
        )
        assert allowed.status_code == 200

    def test_the_flag_travels_on_the_thread_detail_too(self, client: TestClient, app) -> None:  # type: ignore[no-untyped-def]
        token = enrolled(client)
        thread = client.post(f"{FORUM}/ia-basica/threads", json=THREAD, headers=auth(token)).json()

        detail = client.get(f"{FORUM}/ia-basica/threads/{thread['id']}", headers=auth(token)).json()
        assert detail["can_moderate"] is False

        admin = register(client, "admin2@ministerio.gob", "Admin Dos")
        promote(app, "admin2@ministerio.gob", Role.ADMIN)
        as_admin = client.get(
            f"{FORUM}/ia-basica/threads/{thread['id']}", headers=auth(admin)
        ).json()
        assert as_admin["can_moderate"] is True
