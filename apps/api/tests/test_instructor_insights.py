from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.features.catalog.domain.entities import (
    Course,
    CourseStatus,
    Lesson,
    LessonKind,
    Level,
    Module,
    ModuleActivity,
    Slug,
)
from app.features.instructor.domain.insights import LearnerRecord, summarize


def lesson(title: str, position: int) -> Lesson:
    return Lesson(
        id=uuid4(), title=title, kind=LessonKind.TEXT, position=position, duration_seconds=60
    )


def course_with(modules: list[Module]) -> Course:
    return Course(
        id=uuid4(),
        slug=Slug("ia-basica"),
        title="IA básica",
        summary="Resumen",
        description="Descripción",
        level=Level.BEGINNER,
        status=CourseStatus.PUBLISHED,
        instructor_id=uuid4(),
        instructor_name="Eduardo Calvache",
        modules=modules,
    )


def learner(
    *,
    day: int = 1,
    completed: set[UUID] | None = None,
    attempted: set[UUID] | None = None,
    passed: set[UUID] | None = None,
    last_activity_at: datetime | None = None,
) -> LearnerRecord:
    return LearnerRecord(
        enrolled_at=datetime(2026, 10, day, 15, 0, tzinfo=UTC),
        completed_lesson_ids=frozenset(completed or set()),
        attempted_activity_ids=frozenset(attempted or set()),
        passed_activity_ids=frozenset(passed or set()),
        last_activity_at=last_activity_at,
    )


def test_an_empty_course_reports_zeros_and_empty_series() -> None:
    a1 = lesson("A1", 1)
    course = course_with([Module(id=uuid4(), title="Módulo 1", position=1, lessons=[a1])])

    insights = summarize(course, [])

    assert (insights.enrolled, insights.finished, insights.in_progress, insights.not_started) == (
        0,
        0,
        0,
        0,
    )
    assert insights.completion_rate == 0
    assert [(item.title, item.completed) for item in insights.lessons] == [("A1", 0)]
    assert insights.enrollments_by_day == []
    assert insights.last_activity_at is None


def test_the_three_states_add_up_to_everyone_enrolled() -> None:
    a1, a2 = lesson("A1", 1), lesson("A2", 2)
    course = course_with([Module(id=uuid4(), title="Módulo 1", position=1, lessons=[a1, a2])])

    insights = summarize(
        course,
        [
            learner(completed={a1.id, a2.id}),
            learner(completed={a1.id}),
            learner(),
            learner(),
        ],
    )

    assert insights.enrolled == 4
    assert insights.finished == 1
    assert insights.in_progress == 1
    assert insights.not_started == 2
    assert insights.completion_rate == 25


def test_lessons_done_with_a_practice_still_to_pass_is_not_finished() -> None:
    a1 = lesson("A1", 1)
    practice = ModuleActivity(id=uuid4(), title="Primer prompt", max_attempts=3)
    course = course_with(
        [Module(id=uuid4(), title="Módulo 1", position=1, lessons=[a1], activities=[practice])]
    )

    insights = summarize(
        course,
        [
            learner(completed={a1.id}, attempted={practice.id}, passed={practice.id}),
            learner(completed={a1.id}, attempted={practice.id}),
            learner(completed={a1.id}),
        ],
    )

    assert insights.finished == 1
    assert insights.in_progress == 2
    assert [(item.title, item.attempted, item.passed) for item in insights.activities] == [
        ("Primer prompt", 2, 1)
    ]


def test_lessons_come_back_in_syllabus_order_with_their_module() -> None:
    a1, a2, b1 = lesson("A1", 1), lesson("A2", 2), lesson("B1", 1)
    course = course_with(
        [
            Module(id=uuid4(), title="Módulo 2", position=2, lessons=[b1]),
            Module(id=uuid4(), title="Módulo 1", position=1, lessons=[a2, a1]),
        ]
    )

    insights = summarize(course, [learner(completed={a1.id, a2.id}), learner(completed={a1.id})])

    assert [(item.module_title, item.title, item.completed) for item in insights.lessons] == [
        ("Módulo 1", "A1", 2),
        ("Módulo 1", "A2", 1),
        ("Módulo 2", "B1", 0),
    ]


def test_a_completion_for_a_lesson_the_course_no_longer_has_is_ignored() -> None:
    a1 = lesson("A1", 1)
    course = course_with([Module(id=uuid4(), title="Módulo 1", position=1, lessons=[a1])])

    insights = summarize(course, [learner(completed={uuid4()})])

    assert insights.not_started == 1
    assert insights.lessons[0].completed == 0


def test_enrolments_are_counted_per_day_in_ascending_order() -> None:
    course = course_with([Module(id=uuid4(), title="Módulo 1", position=1, lessons=[])])

    insights = summarize(course, [learner(day=9), learner(day=3), learner(day=9)])

    assert [(item.day.isoformat(), item.count) for item in insights.enrollments_by_day] == [
        ("2026-10-03", 1),
        ("2026-10-09", 2),
    ]


def test_last_activity_is_the_latest_across_everyone() -> None:
    course = course_with([Module(id=uuid4(), title="Módulo 1", position=1, lessons=[])])
    earlier = datetime(2026, 10, 2, 9, 0, tzinfo=UTC)
    later = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)

    insights = summarize(
        course, [learner(last_activity_at=earlier), learner(), learner(last_activity_at=later)]
    )

    assert insights.last_activity_at == later
