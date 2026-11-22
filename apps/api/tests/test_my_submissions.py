"""GET /lab/submissions: every lab attempt of the signed-in teacher, in one request.

The home and history screens used to walk every activity of every enrolled
course, one request each. This endpoint answers with all of them at once.
"""

import time

from tests.test_query_budget import FIRST, Harness, _enroll, harness  # noqa: F401


def _first_activity(harness: Harness) -> dict[str, str]:  # noqa: F811
    course = harness.client.get(f"/api/v1/catalog/courses/{FIRST}").json()
    for module in course["modules"]:
        for activity in module["activities"]:
            return {"id": activity["id"], "title": activity["title"], "course": course["title"]}
    raise AssertionError("the seeded course has no activity")


def _submit(harness: Harness, activity_id: str, prompt: str) -> None:  # noqa: F811
    response = harness.client.post(
        f"/api/v1/lab/activities/{activity_id}/submissions",
        json={"prompt": prompt},
        headers=harness.headers,
    )
    assert response.status_code == 202, response.text


def test_lists_every_attempt_newest_first_with_its_course(harness: Harness) -> None:  # noqa: F811
    _enroll(harness, FIRST)
    activity = _first_activity(harness)
    _submit(harness, activity["id"], "Primer intento del pedido")
    _submit(harness, activity["id"], "Segundo intento del pedido, más claro")

    # The background evaluations of those two attempts open their own sessions;
    # let them finish so the measure below sees only this request.
    for _ in range(200):
        rows = harness.client.get("/api/v1/lab/submissions", headers=harness.headers).json()
        if all(row["status"] not in ("pending", "running") for row in rows):
            break
        time.sleep(0.05)

    with harness.measure() as meter:
        response = harness.client.get("/api/v1/lab/submissions", headers=harness.headers)

    assert response.status_code == 200, response.text
    rows = response.json()
    assert [row["attempt"] for row in rows] == [2, 1]
    assert {row["activity_id"] for row in rows} == {activity["id"]}
    assert rows[0]["activity_title"] == activity["title"]
    assert rows[0]["course_slug"] == FIRST
    assert rows[0]["course_title"] == activity["course"]
    assert rows[0]["prompt"] == "Segundo intento del pedido, más claro"
    # One session and a fixed number of statements, however many attempts.
    assert meter.checkouts <= 1


def test_is_empty_for_a_teacher_without_attempts(harness: Harness) -> None:  # noqa: F811
    response = harness.client.get("/api/v1/lab/submissions", headers=harness.headers)
    assert response.status_code == 200
    assert response.json() == []


def test_requires_a_session(harness: Harness) -> None:  # noqa: F811
    response = harness.client.get("/api/v1/lab/submissions")
    assert response.status_code == 401
