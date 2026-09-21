"""The three courses the first charla publishes.

These slugs are the public URLs teachers will share. If they drift, the seed
loads something else and GET /catalog looks empty or wrong.
"""

from app.content.teacher_catalog import TEACHER_ACTIVITIES, TEACHER_COURSES

CANONICAL_SLUGS = (
    "prompting-para-docentes",
    "notebooklm-en-el-aula",
    "evaluacion-asistida-por-ia",
)


def test_teacher_courses_publish_the_three_canonical_slugs() -> None:
    assert [course["slug"] for course in TEACHER_COURSES] == list(CANONICAL_SLUGS)


def test_each_canonical_course_has_a_lab() -> None:
    assert [activity["course_slug"] for activity in TEACHER_ACTIVITIES] == list(CANONICAL_SLUGS)
