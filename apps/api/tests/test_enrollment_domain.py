from uuid import uuid4

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
from app.features.enrollment.domain.entities import compute_progress, syllabus_order


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


def two_module_course() -> tuple[Course, list[Lesson]]:
    a1, a2 = lesson("A1", 1), lesson("A2", 2)
    b1 = lesson("B1", 1)

    course = course_with(
        [
            Module(id=uuid4(), title="Módulo 2", position=2, lessons=[b1]),
            Module(id=uuid4(), title="Módulo 1", position=1, lessons=[a2, a1]),
        ]
    )
    return course, [a1, a2, b1]


class TestSyllabusOrder:
    def test_walks_modules_then_lessons_regardless_of_storage_order(self) -> None:
        course, (a1, a2, b1) = two_module_course()

        order = [ref.lesson_id for ref in syllabus_order(course)]

        assert order == [a1.id, a2.id, b1.id]

    def test_each_reference_carries_its_module(self) -> None:
        # The "continue" screen has to be able to name the module the teacher is
        # returning to, not just the lesson.
        course, _ = two_module_course()

        first = syllabus_order(course)[0]

        assert first.module_title == "Módulo 1"


class TestComputeProgress:
    def test_a_fresh_enrollment_starts_at_the_first_lesson(self) -> None:
        course, (a1, _, _) = two_module_course()

        progress = compute_progress(course, set())

        assert progress.percentage == 0
        assert not progress.has_started
        assert progress.next_lesson is not None
        assert progress.next_lesson.lesson_id == a1.id

    def test_the_next_lesson_is_the_first_gap_not_the_one_after_the_last_done(self) -> None:
        # A teacher who skipped ahead is sent back to what they missed. Anything
        # else silently lets them finish a course they did not take.
        course, (a1, a2, b1) = two_module_course()

        progress = compute_progress(course, {a2.id, b1.id})

        assert progress.next_lesson is not None
        assert progress.next_lesson.lesson_id == a1.id

    def test_the_next_lesson_crosses_into_the_following_module(self) -> None:
        course, (a1, a2, b1) = two_module_course()

        progress = compute_progress(course, {a1.id, a2.id})

        assert progress.next_lesson is not None
        assert progress.next_lesson.lesson_id == b1.id
        assert progress.next_lesson.module_title == "Módulo 2"

    def test_a_finished_course_has_no_next_lesson(self) -> None:
        course, lessons = two_module_course()

        progress = compute_progress(course, {item.id for item in lessons})

        assert progress.is_complete
        assert progress.percentage == 100
        assert progress.next_lesson is None

    def test_percentage_is_rounded_from_the_ratio(self) -> None:
        course, (a1, _, _) = two_module_course()

        assert compute_progress(course, {a1.id}).percentage == 33

    def test_completions_for_lessons_the_course_no_longer_has_are_ignored(self) -> None:
        # An instructor deleting a lesson must never push anyone past 100%.
        course, (a1, a2, b1) = two_module_course()

        progress = compute_progress(course, {a1.id, a2.id, b1.id, uuid4(), uuid4()})

        assert progress.completed_lessons == 3
        assert progress.percentage == 100

    def test_an_empty_course_is_not_a_finished_course(self) -> None:
        # Otherwise a syllabus still being written hands out completion for free.
        empty = course_with([])

        progress = compute_progress(empty, set())

        assert progress.percentage == 0
        assert not progress.is_complete
        assert progress.next_lesson is None

    def test_progress_is_derived_never_stored(self) -> None:
        # Adding a lesson moves the percentage down on the next read, which is
        # the whole point of computing it.
        course, (a1, a2, b1) = two_module_course()
        done = {a1.id, a2.id, b1.id}
        assert compute_progress(course, done).percentage == 100

        course.modules[0].lessons.append(lesson("B2", 2))

        assert compute_progress(course, done).percentage == 75

    def test_lessons_done_with_a_practice_pending_is_complete_but_not_finished(self) -> None:
        # `is_complete` stays lessons-only (certificates rely on it); the client
        # announces "finished" from `is_finished`.
        course, lessons = two_module_course()
        activity = ModuleActivity(id=uuid4(), title="Práctica", max_attempts=3)
        course.modules[0].activities.append(activity)
        done = {item.id for item in lessons}

        pending = compute_progress(course, done)
        passed = compute_progress(course, done, {activity.id})

        assert pending.is_complete
        assert pending.pending_activity_ids == {activity.id}
        assert not pending.is_finished
        assert passed.is_finished
        assert not passed.pending_activity_ids

    def test_unfinished_lessons_are_never_finished_even_without_activities(self) -> None:
        course, (a1, _, _) = two_module_course()

        assert not compute_progress(course, {a1.id}).is_finished
