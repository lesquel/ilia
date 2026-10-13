"""How a course is going, counted from what each enrolled person has done.

Pure Python. The counting lives here rather than in SQL so that "finished" is
decided by `compute_progress` — the same rule the teacher taking the course
sees. A second definition written as a query would drift from it the first time
the rule changed.
"""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from uuid import UUID

from app.features.catalog.domain.entities import Course
from app.features.enrollment.domain.entities import compute_progress, syllabus_order


@dataclass(frozen=True)
class LearnerRecord:
    """What one enrolled person has done in the course."""

    enrolled_at: datetime | None
    completed_lesson_ids: frozenset[UUID]
    attempted_activity_ids: frozenset[UUID]
    passed_activity_ids: frozenset[UUID]
    last_activity_at: datetime | None


@dataclass(frozen=True)
class LessonInsight:
    lesson_id: UUID
    title: str
    module_title: str
    completed: int


@dataclass(frozen=True)
class ActivityInsight:
    activity_id: UUID
    title: str
    module_title: str
    attempted: int
    passed: int


@dataclass(frozen=True)
class DayCount:
    day: date
    count: int


@dataclass(frozen=True)
class CourseInsights:
    enrolled: int
    finished: int
    in_progress: int
    not_started: int
    lessons: list[LessonInsight]
    activities: list[ActivityInsight]
    enrollments_by_day: list[DayCount]
    last_activity_at: datetime | None

    @property
    def completion_rate(self) -> int:
        if self.enrolled == 0:
            return 0
        return round(self.finished * 100 / self.enrolled)


def summarize(course: Course, learners: Sequence[LearnerRecord]) -> CourseInsights:
    finished = 0
    in_progress = 0
    lesson_counts: Counter[UUID] = Counter()
    attempted_counts: Counter[UUID] = Counter()
    passed_counts: Counter[UUID] = Counter()
    days: Counter[date] = Counter()

    for learner in learners:
        progress = compute_progress(
            course, set(learner.completed_lesson_ids), set(learner.passed_activity_ids)
        )

        if progress.is_finished:
            finished += 1
        elif progress.has_started:
            in_progress += 1

        lesson_counts.update(progress.completed_lesson_ids)
        # A pass implies an attempt, even if the submission row behind it is
        # not the one that was read.
        attempted_counts.update(learner.attempted_activity_ids | learner.passed_activity_ids)
        passed_counts.update(learner.passed_activity_ids)

        if learner.enrolled_at is not None:
            days[_day_of(learner.enrolled_at)] += 1

    last_seen = [
        learner.last_activity_at for learner in learners if learner.last_activity_at is not None
    ]

    return CourseInsights(
        enrolled=len(learners),
        finished=finished,
        in_progress=in_progress,
        not_started=len(learners) - finished - in_progress,
        lessons=[
            LessonInsight(
                lesson_id=ref.lesson_id,
                title=ref.lesson_title,
                module_title=ref.module_title,
                completed=lesson_counts[ref.lesson_id],
            )
            for ref in syllabus_order(course)
        ],
        activities=[
            ActivityInsight(
                activity_id=activity.id,
                title=activity.title,
                module_title=module.title,
                attempted=attempted_counts[activity.id],
                passed=passed_counts[activity.id],
            )
            for module in course.ordered_modules
            for activity in module.activities
        ],
        enrollments_by_day=[DayCount(day=day, count=count) for day, count in sorted(days.items())],
        last_activity_at=max(last_seen) if last_seen else None,
    )


def _day_of(moment: datetime) -> date:
    # UTC, so the same enrolment lands on the same day whatever timezone the
    # database session happens to return it in.
    return (moment.astimezone(UTC) if moment.tzinfo else moment).date()
