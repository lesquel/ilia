"""Ports for the evaluation feature.

`PromptExecutor` and `PromptJudge` are separate on purpose (TRD T4). The
provider is not decided yet, and abstracting it from day one is what keeps that
decision from reaching into the use cases. It is also what lets the whole
scoring pipeline be tested without spending a single token.
"""

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from app.features.evaluation.domain.entities import (
    Activity,
    Evaluation,
    ModelOutput,
    Submission,
)
from app.features.evaluation.domain.rubric import Rubric


@dataclass(frozen=True)
class UntrustedPrompt:
    """The student's text, wrapped so it cannot be mistaken for an instruction.

    This type exists to make the injection rule impossible to forget. A judge
    adapter receives an `UntrustedPrompt`, never a bare `str`, so "did I
    concatenate user text into the system message?" becomes a question the type
    system asks for you (TRD 6.2.1).

    The real defence is in the adapter — delimit it, label it, never merge it
    into the instructions — but a named type is what makes the next person
    notice there was a rule.
    """

    text: str

    def __str__(self) -> str:  # pragma: no cover - guard, not behaviour
        raise TypeError(
            "Refusing to stringify an UntrustedPrompt. Pass `.text` explicitly, "
            "into a data field of the request — never into instruction text."
        )


class PromptExecutor(Protocol):
    async def execute(self, prompt: UntrustedPrompt, *, max_output_tokens: int) -> ModelOutput:
        """Run the student's prompt in isolation (TRD 6.1 step 2).

        Isolation is the point: this call carries the student's text and nothing
        of ours. Whatever it says, it is answering only itself.
        """
        ...


@dataclass(frozen=True)
class JudgeVerdict:
    """What the judge proposed.

    Deliberately raw. Scores are per-dimension only — there is no total field,
    because a total coming from the model is a total that can be talked up
    (TRD 6.2.3). The backend computes it.
    """

    scores: dict[str, tuple[float, str]]
    feedback: str
    suggestion: str
    model: str
    model_version: str
    input_tokens: int = 0
    output_tokens: int = 0


class PromptJudge(Protocol):
    async def judge(
        self,
        *,
        statement: str,
        prompt: UntrustedPrompt,
        output: str,
        rubric: Rubric,
    ) -> JudgeVerdict:
        """Score the prompt and the result against the rubric.

        Implementations must return structured output validated against a
        schema, and reject anything outside it (TRD 6.2.2).
        """
        ...


class ActivityRepository(Protocol):
    async def get(self, activity_id: UUID) -> Activity | None: ...

    async def get_by_module(self, module_id: UUID) -> list[Activity]: ...


class SubmissionRepository(Protocol):
    async def add(self, submission: Submission) -> None: ...

    async def get(self, submission_id: UUID) -> Submission | None: ...

    async def update(self, submission: Submission) -> None: ...

    async def count_attempts(self, *, user_id: UUID, activity_id: UUID) -> int: ...

    async def list_for_activity(self, *, user_id: UUID, activity_id: UUID) -> list[Submission]: ...


class EvaluationRepository(Protocol):
    async def add(self, evaluation: Evaluation) -> None: ...

    async def get_for_submission(self, submission_id: UUID) -> Evaluation | None: ...


class UsageRecorder(Protocol):
    async def record(
        self,
        *,
        user_id: UUID,
        submission_id: UUID,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        """Log what a submission cost.

        Answering "how much does one student cost me?" is what makes the
        freemium tier survivable (TRD 6.4), and it cannot be reconstructed after
        the fact.
        """
        ...


class QuotaPolicy(Protocol):
    async def remaining(self, user_id: UUID) -> int | None:
        """Evaluations left this period, or None for unlimited."""
        ...

    async def consume(self, user_id: UUID) -> None: ...


class EvaluationQueue(Protocol):
    async def enqueue(self, submission_id: UUID) -> None:
        """Hand a submission off to be evaluated out of band."""
        ...
