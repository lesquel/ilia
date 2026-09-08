"""Test doubles for the evaluation ports.

The whole scoring pipeline runs against these, so the suite exercises the real
graph without spending a token (TRD 13).
"""

from dataclasses import dataclass
from uuid import UUID

from app.features.evaluation.application.use_cases import RunEvaluation, SubmitPrompt
from app.features.evaluation.domain.entities import Activity, ModelOutput, Submission
from app.features.evaluation.domain.ports import (
    JudgeVerdict,
    UntrustedPrompt,
)
from app.features.evaluation.domain.rubric import Rubric
from app.features.evaluation.infrastructure.memory_repository import (
    InMemoryActivityRepository,
    InMemoryEvaluationRepository,
    InMemorySubmissionRepository,
    InMemoryUsageRecorder,
    UnlimitedQuota,
)
from tests.fakes import FrozenClock

TEACHER = UUID("11111111-1111-1111-1111-111111111111")


class EchoExecutor:
    """Returns the prompt back as the model's answer.

    Enough to exercise the pipeline, and deliberately dumb: nothing about the
    grade should depend on this being clever.
    """

    def __init__(self, fail: bool = False) -> None:
        self._fail = fail
        self.received: list[str] = []

    async def execute(self, prompt: UntrustedPrompt, *, max_output_tokens: int) -> ModelOutput:
        if self._fail:
            raise RuntimeError("provider unavailable")

        self.received.append(prompt.text)
        return ModelOutput(
            text=f"Respuesta generada a partir de: {prompt.text[:80]}",
            model="fake-executor",
            model_version="1",
            input_tokens=len(prompt.text) // 4,
            output_tokens=max_output_tokens // 10,
        )


class CompliantJudge:
    """A judge that awards the same score to every dimension it is given.

    Standing in for a fully compromised judge: if an injection worked
    perfectly, this is what it would produce. Everything the platform still
    refuses to grant is a guarantee that does not depend on the model.
    """

    def __init__(
        self,
        score: float = 80.0,
        feedback: str = "Buen trabajo.",
        suggestion: str = "",
    ) -> None:
        self._score = score
        self._feedback = feedback
        self._suggestion = suggestion
        self.saw_prompt: str | None = None

    async def judge(
        self,
        *,
        statement: str,
        prompt: UntrustedPrompt,
        output: str,
        rubric: Rubric,
    ) -> JudgeVerdict:
        self.saw_prompt = prompt.text

        return JudgeVerdict(
            scores={
                dimension.key: (self._score, f"Justificación para {dimension.key}")
                for dimension in rubric.dimensions
            },
            feedback=self._feedback,
            suggestion=self._suggestion,
            model="fake-judge",
            model_version="1",
            input_tokens=100,
            output_tokens=50,
        )


class RecordingQueue:
    def __init__(self) -> None:
        self.enqueued: list[UUID] = []

    async def enqueue(self, submission_id: UUID) -> None:
        self.enqueued.append(submission_id)


@dataclass
class Repos:
    activities: InMemoryActivityRepository
    submissions: InMemorySubmissionRepository
    evaluations: InMemoryEvaluationRepository
    usage: InMemoryUsageRecorder
    queue: RecordingQueue


def build_run_evaluation(
    activity: Activity,
    *,
    executor: EchoExecutor,
    judge: CompliantJudge,
) -> tuple[RunEvaluation, Repos]:
    repos = Repos(
        activities=InMemoryActivityRepository([activity]),
        submissions=InMemorySubmissionRepository(),
        evaluations=InMemoryEvaluationRepository(),
        usage=InMemoryUsageRecorder(),
        queue=RecordingQueue(),
    )

    run = RunEvaluation(
        activities=repos.activities,
        submissions=repos.submissions,
        evaluations=repos.evaluations,
        executor=executor,
        judge=judge,
        usage=repos.usage,
        clock=FrozenClock(),
    )

    return run, repos


async def submit(
    repos: Repos, activity: Activity, *, prompt: str, user_id: UUID = TEACHER
) -> Submission:
    return await SubmitPrompt(
        activities=repos.activities,
        submissions=repos.submissions,
        quota=UnlimitedQuota(),
        queue=repos.queue,
        clock=FrozenClock(),
    ).execute(user_id=user_id, activity_id=activity.id, prompt=prompt)
