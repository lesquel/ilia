"""Evaluation use cases.

`RunEvaluation` below is the graph of TRD 6.1, expressed as ordinary Python over
ports. That is the shipped engine. A later adapter may implement `PromptExecutor`
and `PromptJudge`; it does not replace this orchestration, and the sequence
stays testable without a provider.
"""

from uuid import UUID

import structlog

from app.features.auth.domain.ports import Clock
from app.features.evaluation.domain.checks import (
    DETERMINISTIC_KEY,
    CheckOutcome,
    CheckResult,
    run_checks,
)
from app.features.evaluation.domain.entities import (
    MAX_PROMPT_CHARS,
    Activity,
    Evaluation,
    Submission,
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
from app.features.evaluation.domain.ports import (
    ActivityRepository,
    EvaluationQueue,
    EvaluationRepository,
    PromptExecutor,
    PromptJudge,
    QuotaPolicy,
    SubmissionRepository,
    UntrustedPrompt,
    UsageRecorder,
)
from app.features.evaluation.domain.scoring import (
    ScoreBreakdown,
    aggregate,
    weakest_dimension,
)

# Hard ceiling on the model's answer. Bounds the cost of one submission
# regardless of what the student asked for (TRD 6.4).
MAX_OUTPUT_TOKENS = 1200

logger = structlog.get_logger()


class SubmitPrompt:
    """Accept a submission and hand it off to be evaluated.

    Everything cheap happens here and now — validation, attempts, quota — so a
    submission that was never going to be graded never reaches a paid model
    call.
    """

    def __init__(
        self,
        *,
        activities: ActivityRepository,
        submissions: SubmissionRepository,
        quota: QuotaPolicy,
        queue: EvaluationQueue,
        clock: Clock,
    ) -> None:
        self._activities = activities
        self._submissions = submissions
        self._quota = quota
        self._queue = queue
        self._clock = clock

    async def execute(self, *, user_id: UUID, activity_id: UUID, prompt: str) -> Submission:
        activity = await self._activities.get(activity_id)
        if activity is None:
            raise ActivityNotFoundError()

        cleaned = prompt.strip()
        if not cleaned:
            raise EmptyPromptError()
        if len(cleaned) > MAX_PROMPT_CHARS:
            raise PromptTooLongError(MAX_PROMPT_CHARS)

        used = await self._submissions.count_attempts(user_id=user_id, activity_id=activity_id)
        if activity.attempts_left(used) <= 0:
            raise NoAttemptsLeftError(activity.max_attempts)

        remaining = await self._quota.remaining(user_id)
        if remaining is not None and remaining <= 0:
            raise EvaluationQuotaExceededError()

        submission = Submission.create(
            activity_id=activity_id,
            user_id=user_id,
            prompt=cleaned,
            attempt=used + 1,
            created_at=self._clock.now(),
        )
        await self._submissions.add(submission)

        # Consume after the submission exists. The other order would charge a
        # teacher for an evaluation that was never recorded.
        await self._quota.consume(user_id)
        await self._queue.enqueue(submission.id)

        return submission


class RunEvaluation:
    """The evaluation graph (TRD 6.1).

    validate → execute in isolation → deterministic checks ‖ model judgement →
    aggregate → feedback → persist.
    """

    def __init__(
        self,
        *,
        activities: ActivityRepository,
        submissions: SubmissionRepository,
        evaluations: EvaluationRepository,
        executor: PromptExecutor,
        judge: PromptJudge,
        usage: UsageRecorder,
        clock: Clock,
    ) -> None:
        self._activities = activities
        self._submissions = submissions
        self._evaluations = evaluations
        self._executor = executor
        self._judge = judge
        self._usage = usage
        self._clock = clock

    async def execute(self, submission_id: UUID) -> Evaluation | None:
        submission = await self._submissions.get(submission_id)
        if submission is None:
            raise SubmissionNotFoundError()

        activity = await self._activities.get(submission.activity_id)
        if activity is None:
            raise ActivityNotFoundError()

        submission.status = SubmissionStatus.RUNNING
        await self._submissions.update(submission)

        untrusted = UntrustedPrompt(submission.prompt)

        try:
            output = await self._executor.execute(untrusted, max_output_tokens=MAX_OUTPUT_TOKENS)
            verdict = await self._judge.judge(
                statement=activity.statement,
                prompt=untrusted,
                output=output.text,
                rubric=activity.rubric,
            )
        except Exception as exc:
            # A provider outage must leave a state the student can see and
            # retry, not a submission that silently never finishes.
            submission.status = SubmissionStatus.FAILED
            submission.failure_reason = type(exc).__name__
            await self._submissions.update(submission)
            logger.warning(
                "evaluation_failed",
                submission_id=str(submission_id),
                error=type(exc).__name__,
            )
            return None

        checks = run_checks(submission.prompt, activity.checks)

        # The deterministic component overwrites whatever the judge said about
        # it. That is the whole point of an anchor: the model does not get a
        # vote on a fact we can measure.
        raw_scores = dict(verdict.scores)
        if activity.rubric.by_key(DETERMINISTIC_KEY) is not None:
            raw_scores[DETERMINISTIC_KEY] = (
                checks.score,
                _describe_checks(checks.failures),
            )

        # A failed deterministic check blocks the attempt from counting, no
        # matter what the judge awarded. The number still says how good the
        # prompt was; passing additionally requires having done what the
        # activity asked.
        breakdown = aggregate(activity.rubric, raw_scores, meets_requirements=not checks.failures)

        evaluation = Evaluation(
            id=submission.id,
            submission_id=submission.id,
            rubric_version=activity.rubric.version,
            total=breakdown.total,
            dimension_scores=breakdown.dimension_scores,
            feedback=verdict.feedback.strip(),
            suggestion=_suggestion_for(activity, breakdown, verdict.suggestion, checks),
            passed=breakdown.passed,
            check_failures=[failure.message for failure in checks.failures],
            model=verdict.model,
            model_version=verdict.model_version,
            evaluated_at=self._clock.now(),
            generated_text=output.text,
        )
        await self._evaluations.add(evaluation)

        # Usage first, then the status. The other order leaves a window where
        # the submission is no longer in flight and its usage row does not exist
        # yet — and in that window the quota counts it neither as committed nor
        # as spent, so a second submission slips through a limit of one.
        await self._usage.record(
            user_id=submission.user_id,
            submission_id=submission.id,
            model=verdict.model,
            input_tokens=output.input_tokens + verdict.input_tokens,
            output_tokens=output.output_tokens + verdict.output_tokens,
        )

        submission.status = SubmissionStatus.SCORED
        await self._submissions.update(submission)

        # An anomalously high mark is worth a second look (TRD 6.2.4): it is the
        # shape a successful injection leaves behind.
        if breakdown.total >= 98:
            logger.info(
                "evaluation_anomalously_high",
                submission_id=str(submission_id),
                total=breakdown.total,
            )

        return evaluation


def _describe_checks(failures: list[CheckResult]) -> str:
    if not failures:
        return "El prompt cumple todos los requisitos verificables de la actividad."
    return "Faltan requisitos verificables: " + " ".join(item.message for item in failures)


def _suggestion_for(
    activity: Activity,
    breakdown: ScoreBreakdown,
    model_suggestion: str,
    checks: CheckOutcome,
) -> str:
    """One concrete next step.

    A failed deterministic check outranks anything the model suggested: it is
    specific, certain, and fixable in seconds. Only when nothing objective is
    missing do we fall back to the model's advice.
    """
    if checks.failures:
        return checks.failures[0].message

    cleaned = model_suggestion.strip()
    if cleaned:
        return cleaned

    weakest = weakest_dimension(activity.rubric, breakdown)
    if weakest is not None:
        return f"Trabaja sobre «{weakest.name}»: {weakest.description}"

    return "Vuelve a intentarlo dándole más contexto al modelo."


class GetSubmissionResult:
    def __init__(
        self,
        *,
        submissions: SubmissionRepository,
        evaluations: EvaluationRepository,
    ) -> None:
        self._submissions = submissions
        self._evaluations = evaluations

    async def execute(
        self, *, user_id: UUID, submission_id: UUID
    ) -> tuple[Submission, Evaluation | None]:
        submission = await self._submissions.get(submission_id)

        # A submission that is not yours answers exactly like one that does not
        # exist, so ids cannot be probed.
        if submission is None or submission.user_id != user_id:
            raise SubmissionNotFoundError()

        evaluation = await self._evaluations.get_for_submission(submission_id)
        return submission, evaluation
