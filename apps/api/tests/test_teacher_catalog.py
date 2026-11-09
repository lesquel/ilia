"""The canonical teacher courses the first charla publishes.

These slugs are the public URLs teachers will share. If they drift, the seed
loads something else and GET /catalog looks empty or wrong.
"""

import json

from app.content.teacher_catalog import (
    LESSON_EXAMPLES,
    TEACHER_ACTIVITIES,
    TEACHER_COURSES,
)

CANONICAL_SLUGS = (
    "introduccion-ia-docentes",
    "gemini-con-tu-libro",
    "prompting-para-docentes",
    "notebooklm-en-el-aula",
    "evaluacion-asistida-por-ia",
)

PROMPTING_SLUG = "prompting-para-docentes"
GEMINI_SLUG = "gemini-con-tu-libro"


def _prompting_course() -> dict:
    return next(course for course in TEACHER_COURSES if course["slug"] == PROMPTING_SLUG)


def _prompting_lessons() -> list[tuple[str, str, int, str]]:
    lessons: list[tuple[str, str, int, str]] = []
    for _module_title, module_lessons in _prompting_course()["modules"]:
        lessons.extend(module_lessons)
    return lessons


def _prompting_bodies() -> str:
    return "\n".join(body for _title, _kind, _duration, body in _prompting_lessons())


def _prompting_lab() -> dict:
    return next(
        activity for activity in TEACHER_ACTIVITIES if activity["course_slug"] == PROMPTING_SLUG
    )


def test_teacher_courses_publish_the_canonical_slugs() -> None:
    assert [course["slug"] for course in TEACHER_COURSES] == list(CANONICAL_SLUGS)


def test_each_canonical_course_has_a_lab() -> None:
    slugs = [activity["course_slug"] for activity in TEACHER_ACTIVITIES]
    assert list(dict.fromkeys(slugs)) == list(CANONICAL_SLUGS)
    # Los demás cursos tienen un taller; el de Gemini, uno por módulo y el examen final.
    assert slugs.count(GEMINI_SLUG) == 4
    assert all(slugs.count(slug) == 1 for slug in CANONICAL_SLUGS if slug != GEMINI_SLUG)


def test_prompting_bodies_cite_destreza_and_ineval() -> None:
    bodies = _prompting_bodies()
    assert "LL.3.3.3" in bodies
    assert "682 / 61,9 %" in bodies
    assert "LL.3.3.4" in bodies
    assert "7.º" in bodies


def test_prompting_lesson_titles_are_not_the_destreza_code() -> None:
    titles = [title for title, _kind, _duration, _body in _prompting_lessons()]
    assert "LL.3.3.3" not in titles


def test_prompting_lab_names_grade_and_destreza() -> None:
    lab = _prompting_lab()
    assert "prompt" not in lab["title"].lower()
    assert "pedido" in lab["title"].lower()
    assert "LL.3.3.3" in lab["statement"]
    assert "7.º" in lab["statement"]


def test_prompting_example_titles_say_pedido_not_prompt() -> None:
    prompting_titles = {title for title, _kind, _duration, _body in _prompting_lessons()}
    for lesson_title in prompting_titles:
        for example_title, _example_body in LESSON_EXAMPLES[lesson_title]:
            assert not example_title.startswith("Prompt")


def test_prompting_worked_sheet_distinguishes_theme_from_main_ideas() -> None:
    """LL.3.3.3 is tema vs ideas principales, not ¿dónde / qué día / quién."""
    sheets = []
    prompting_titles = {title for title, _kind, _duration, _body in _prompting_lessons()}
    for lesson_title in prompting_titles:
        for example_title, body in LESSON_EXAMPLES[lesson_title]:
            if example_title.startswith("Esperamos"):
                assert "¿Dónde está Juana?" not in body, lesson_title
            if example_title.startswith("Esperamos: la hoja"):
                sheets.append(body)
    assert sheets, "expected the worked five-question sheets"
    for sheet in sheets:
        lower = sheet.lower()
        assert "tema" in lower
        assert "idea principal" in lower

    pedido = next(
        body
        for title, body in LESSON_EXAMPLES["Las cinco piezas"]
        if title == "El pedido con las cinco piezas"
    )
    assert "tema" in pedido.lower()
    assert "ideas principales" in pedido.lower()


def test_intro_quiz_answer_key_stays_with_its_option_after_shuffling() -> None:
    course = next(
        course for course in TEACHER_COURSES if course["slug"] == "introduccion-ia-docentes"
    )
    expected_answers = {
        "¿Qué conoce el modelo sobre el grupo de séptimo?": (
            "Solo lo que la docente le cuenta o adjunta"
        ),
        "¿Para qué sirve el primer resultado?": "Como borrador que la docente revisa",
        "¿Cómo comprobamos una respuesta de lectura?": "Buscando evidencia en el texto",
        "Si una pregunta pide inventar un dato que el texto no contiene, ¿qué conviene hacer?": (
            "Corregirla o pedir otra versión"
        ),
    }

    for _module_title, lessons in course["modules"]:
        quiz = json.loads(next(lesson[3] for lesson in lessons if lesson[1] == "quiz"))
        for question in quiz["questions"]:
            if question["question"] in expected_answers:
                answer = question["options"][question["answer"]]
                assert answer == expected_answers[question["question"]]


def _gemini_course() -> dict:
    return next(course for course in TEACHER_COURSES if course["slug"] == GEMINI_SLUG)


def test_gemini_course_follows_the_starting_course() -> None:
    slugs = [course["slug"] for course in TEACHER_COURSES]
    assert slugs[0] == "introduccion-ia-docentes"
    assert slugs[1] == GEMINI_SLUG


def test_gemini_course_videos_point_at_the_curso_docentes_folder() -> None:
    videos = [
        lesson
        for _title, lessons in _gemini_course()["modules"]
        for lesson in lessons
        if lesson[1] == "video"
    ]
    assert len(videos) == 18
    for lesson in videos:
        assert len(lesson) == 5
        assert lesson[4].startswith("cursos/curso-docentes/")
        assert lesson[4].endswith(".mp4")
        assert lesson[3].strip()
    assert all(lesson[2] > 0 for lesson in videos)


def test_gemini_course_has_one_lab_per_module_and_a_final_exam() -> None:
    modules = _gemini_course()["modules"]
    labs = [activity for activity in TEACHER_ACTIVITIES if activity["course_slug"] == GEMINI_SLUG]
    assert [lab["module_position"] for lab in labs] == [*range(1, len(modules) + 1), len(modules)]
    assert "Examen final" in labs[-1]["title"]
    assert len({lab["title"] for lab in labs}) == len(labs)


def test_gemini_course_only_cites_the_printed_destreza_code() -> None:
    import re

    bodies = "\n".join(
        lesson[3] for _title, lessons in _gemini_course()["modules"] for lesson in lessons
    )
    statements = "\n".join(
        activity["statement"]
        for activity in TEACHER_ACTIVITIES
        if activity["course_slug"] == GEMINI_SLUG
    )
    codes = set(re.findall(r"\bLL\.\d+\.\d+\.\d+\b", bodies + statements))
    assert codes == {"LL.5.4.2"}
