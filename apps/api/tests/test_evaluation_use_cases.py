"""Submitting a prompt: attempts, quota and cost control."""

from uuid import uuid4

import pytest

from app.features.evaluation.application.use_cases import (
    GetSubmissionResult,
    SubmitPrompt,
)
from app.features.evaluation.domain.entities import (
    MAX_PROMPT_CHARS,
    Activity,
    SubmissionStatus,
)
from app.features.evaluation.domain.errors import (
    ActivityNotFoundError,
    EmptyPromptError,
    EvaluationQuotaExceededError,
    NoAttemptsLeftError,
    PromptTooLongError,
    SubmissionNotFoundError,
)
from app.features.evaluation.infrastructure.memory_repository import (
    FixedQuota,
    InMemoryActivityRepository,
    InMemoryEvaluationRepository,
    InMemorySubmissionRepository,
    UnlimitedQuota,
)
from tests.evaluation_fakes import (
    TEACHER,
    CompliantJudge,
    EchoExecutor,
    RecordingQueue,
    build_run_evaluation,
    submit,
)
from tests.fakes import FrozenClock
from tests.test_evaluation_injection import activity_with, rubric_with

GOOD_PROMPT = "Actuá como docente y armá 5 ejercicios en una tabla."


@pytest.fixture
def activity() -> Activity:
    return activity_with(rubric_with("claridad"))


def build_submit(
    activity: Activity,
    *,
    quota: object | None = None,
    submissions: InMemorySubmissionRepository | None = None,
    queue: RecordingQueue | None = None,
) -> tuple[SubmitPrompt, InMemorySubmissionRepository, RecordingQueue]:
    repo = submissions or InMemorySubmissionRepository()
    the_queue = queue or RecordingQueue()

    use_case = SubmitPrompt(
        activities=InMemoryActivityRepository([activity]),
        submissions=repo,
        quota=quota or UnlimitedQuota(),  # type: ignore[arg-type]
        queue=the_queue,
        clock=FrozenClock(),
    )

    return use_case, repo, the_queue


class TestValidation:
    async def test_accepts_a_prompt_and_queues_it(self, activity: Activity) -> None:
        use_case, _, queue = build_submit(activity)

        submission = await use_case.execute(
            user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT
        )

        assert submission.status is SubmissionStatus.PENDING
        assert queue.enqueued == [submission.id]

    async def test_rejects_an_empty_prompt(self, activity: Activity) -> None:
        use_case, _, queue = build_submit(activity)

        with pytest.raises(EmptyPromptError):
            await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt="   ")

        # And nothing reached the queue, so nothing reached a paid model call.
        assert queue.enqueued == []

    async def test_rejects_an_oversized_prompt(self, activity: Activity) -> None:
        # Every character is a token the platform pays for (PRD 11).
        use_case, _, _ = build_submit(activity)

        with pytest.raises(PromptTooLongError):
            await use_case.execute(
                user_id=TEACHER, activity_id=activity.id, prompt="x" * (MAX_PROMPT_CHARS + 1)
            )

    async def test_an_unknown_activity_is_not_found(self, activity: Activity) -> None:
        use_case, _, _ = build_submit(activity)

        with pytest.raises(ActivityNotFoundError):
            await use_case.execute(user_id=TEACHER, activity_id=uuid4(), prompt=GOOD_PROMPT)

    async def test_the_prompt_is_trimmed_before_storing(self, activity: Activity) -> None:
        use_case, _, _ = build_submit(activity)

        submission = await use_case.execute(
            user_id=TEACHER, activity_id=activity.id, prompt=f"  {GOOD_PROMPT}  "
        )

        assert submission.prompt == GOOD_PROMPT


class TestAttempts:
    async def test_attempts_are_numbered(self, activity: Activity) -> None:
        use_case, repo, _ = build_submit(activity)

        first = await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT)
        second = await use_case.execute(
            user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT
        )

        assert (first.attempt, second.attempt) == (1, 2)
        assert await repo.count_attempts(user_id=TEACHER, activity_id=activity.id) == 2

    async def test_running_out_of_attempts_is_a_conflict(self, activity: Activity) -> None:
        use_case, _, _ = build_submit(activity)
        for _ in range(activity.max_attempts):
            await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT)

        with pytest.raises(NoAttemptsLeftError):
            await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT)

    async def test_attempts_are_counted_per_teacher(self, activity: Activity) -> None:
        use_case, repo, _ = build_submit(activity)
        other = uuid4()

        await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT)

        assert await repo.count_attempts(user_id=other, activity_id=activity.id) == 0


class TestQuota:
    async def test_a_teacher_out_of_quota_is_refused(self, activity: Activity) -> None:
        # The main lever of the free tier (PRD 11).
        use_case, _, queue = build_submit(activity, quota=FixedQuota(0))

        with pytest.raises(EvaluationQuotaExceededError):
            await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT)

        assert queue.enqueued == []

    async def test_quota_is_consumed_per_submission(self, activity: Activity) -> None:
        quota = FixedQuota(2)
        use_case, _, _ = build_submit(activity, quota=quota)

        await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt=GOOD_PROMPT)

        assert await quota.remaining(TEACHER) == 1

    async def test_a_rejected_submission_does_not_consume_quota(self, activity: Activity) -> None:
        # Being charged for a prompt that was never evaluated is the kind of
        # thing a teacher notices and never forgives.
        quota = FixedQuota(2)
        use_case, _, _ = build_submit(activity, quota=quota)

        with pytest.raises(EmptyPromptError):
            await use_case.execute(user_id=TEACHER, activity_id=activity.id, prompt="")

        assert await quota.remaining(TEACHER) == 2


class TestUsageRecording:
    async def test_token_use_is_recorded_for_every_evaluation(self) -> None:
        # Answering "how much does one student cost me?" cannot be
        # reconstructed after the fact (TRD 6.4).
        activity = activity_with(rubric_with("claridad"))
        run, repos = build_run_evaluation(activity, executor=EchoExecutor(), judge=CompliantJudge())
        submission = await submit(repos, activity, prompt=GOOD_PROMPT)

        await run.execute(submission.id)

        assert len(repos.usage.records) == 1
        record = repos.usage.records[0]
        assert record["input_tokens"] > 0
        assert record["output_tokens"] > 0

    async def test_the_model_and_version_are_stored_with_the_grade(self) -> None:
        # When a provider updates a model, grades shift. Without this there is
        # no way to explain why (TRD 6.3).
        activity = activity_with(rubric_with("claridad"))
        run, repos = build_run_evaluation(activity, executor=EchoExecutor(), judge=CompliantJudge())
        submission = await submit(repos, activity, prompt=GOOD_PROMPT)

        evaluation = await run.execute(submission.id)

        assert evaluation is not None
        assert evaluation.model == "fake-judge"
        assert evaluation.model_version == "1"
        assert evaluation.rubric_version == activity.rubric.version


class TestGetSubmissionResult:
    async def test_returns_the_submission_and_its_evaluation(self) -> None:
        activity = activity_with(rubric_with("claridad"))
        run, repos = build_run_evaluation(activity, executor=EchoExecutor(), judge=CompliantJudge())
        submission = await submit(repos, activity, prompt=GOOD_PROMPT)
        await run.execute(submission.id)

        stored, evaluation = await GetSubmissionResult(
            submissions=repos.submissions, evaluations=repos.evaluations
        ).execute(user_id=TEACHER, submission_id=submission.id)

        assert stored.status is SubmissionStatus.SCORED
        assert evaluation is not None

    async def test_a_pending_submission_has_no_evaluation_yet(self) -> None:
        activity = activity_with(rubric_with("claridad"))
        _, repos = build_run_evaluation(activity, executor=EchoExecutor(), judge=CompliantJudge())
        submission = await submit(repos, activity, prompt=GOOD_PROMPT)

        stored, evaluation = await GetSubmissionResult(
            submissions=repos.submissions, evaluations=repos.evaluations
        ).execute(user_id=TEACHER, submission_id=submission.id)

        assert stored.status is SubmissionStatus.PENDING
        assert evaluation is None

    async def test_another_teachers_submission_answers_like_a_missing_one(self) -> None:
        # Same error either way, so ids cannot be probed.
        activity = activity_with(rubric_with("claridad"))
        _, repos = build_run_evaluation(activity, executor=EchoExecutor(), judge=CompliantJudge())
        submission = await submit(repos, activity, prompt=GOOD_PROMPT)

        with pytest.raises(SubmissionNotFoundError):
            await GetSubmissionResult(
                submissions=repos.submissions, evaluations=InMemoryEvaluationRepository()
            ).execute(user_id=uuid4(), submission_id=submission.id)
