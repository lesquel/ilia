"""Activity, submission and evaluation."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

from app.features.evaluation.domain.checks import CheckSpec
from app.features.evaluation.domain.rubric import Rubric
from app.features.evaluation.domain.scoring import DimensionScore

# Hard ceiling on what a student can send. Not a style preference: every
# character is a token the platform pays for (PRD 11), and an unbounded prompt
# is an unbounded bill.
MAX_PROMPT_CHARS = 4000


# After this many recoveries a submission is given up on and marked failed.
# Two restarts is a deploy or a crash; five is something that will not fix
# itself by trying again.
MAX_RECOVERIES = 3

# How long a client retry key keeps returning the same submission. After this,
# the same key may start a new attempt (the old row's key is cleared on insert).
IDEMPOTENCY_TTL = timedelta(hours=24)


class SubmissionStatus(StrEnum):
    """Evaluation is asynchronous (TRD 3): a model call plus a judging step can
    take tens of seconds, and holding an HTTP request open for that makes the
    app feel broken. The client submits, gets an id, and follows the status."""

    PENDING = "pending"
    RUNNING = "running"
    SCORED = "scored"
    FAILED = "failed"


@dataclass(frozen=True)
class Activity:
    id: UUID
    module_id: UUID
    course_id: UUID
    title: str
    # What the teacher is asked to achieve, in their own words.
    statement: str
    rubric: Rubric
    checks: CheckSpec = field(default_factory=CheckSpec)
    # **[A confirmar]** — the PRD leaves the number open (open question 3).
    max_attempts: int = 3
    course_slug: str = ""
    course_title: str = ""

    def attempts_left(self, used: int) -> int:
        return max(0, self.max_attempts - used)


@dataclass
class ModelOutput:
    """What the model produced from the student's prompt.

    `model` and `model_version` are recorded per submission on purpose: when a
    provider updates a model, grades shift, and without this there is no way to
    explain why (TRD 6.3).
    """

    text: str
    model: str
    model_version: str
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class Submission:
    id: UUID
    activity_id: UUID
    user_id: UUID
    prompt: str
    attempt: int
    status: SubmissionStatus = SubmissionStatus.PENDING
    created_at: datetime | None = None
    # Set once the run finishes. Failure is a state, not an exception the
    # student never hears about.
    failure_reason: str | None = None
    # How many times this submission has been picked back up after a process
    # died mid-flight. Bounded: a submission that crashes the worker every time
    # would otherwise be retried for ever, and each retry costs a model call.
    recoveries: int = 0
    updated_at: datetime | None = None
    idempotency_key: str | None = None

    @classmethod
    def create(
        cls,
        *,
        activity_id: UUID,
        user_id: UUID,
        prompt: str,
        attempt: int,
        created_at: datetime | None = None,
        idempotency_key: str | None = None,
    ) -> "Submission":
        cleaned = prompt.strip()
        if not cleaned:
            raise ValueError("The prompt cannot be empty")
        if len(cleaned) > MAX_PROMPT_CHARS:
            raise ValueError(f"The prompt cannot exceed {MAX_PROMPT_CHARS} characters")

        key = idempotency_key.strip() if idempotency_key else None
        if key == "":
            key = None

        return cls(
            id=uuid4(),
            activity_id=activity_id,
            user_id=user_id,
            prompt=cleaned,
            attempt=attempt,
            created_at=created_at,
            idempotency_key=key,
        )


@dataclass
class Evaluation:
    """The result a teacher reads.

    `rubric_version` is stored with it so a grade stays explainable after the
    instructor edits the rubric.
    """

    id: UUID
    submission_id: UUID
    rubric_version: int
    total: float
    dimension_scores: list[DimensionScore]
    feedback: str
    suggestion: str
    # Whether this attempt counts toward certification. Stored, not recomputed
    # on read: the rules can change later, and a grade already handed out has
    # to keep meaning what it meant.
    passed: bool = False
    check_failures: list[str] = field(default_factory=list)
    model: str = ""
    model_version: str = ""
    evaluated_at: datetime | None = None
    # Set when an instructor overrides the automatic mark (PRD I-03). The
    # original score is never overwritten — the override sits beside it, so the
    # audit trail survives.
    override_total: float | None = None
    override_reason: str | None = None
    override_by: UUID | None = None
    # The sheet the prompt actually produced. The teacher came for the
    # material, not only the mark; throwing it away after judging it is a
    # trick.
    generated_text: str = ""

    @property
    def effective_total(self) -> float:
        """What actually counts. A human's judgement wins over the machine's."""
        return self.override_total if self.override_total is not None else self.total

    @property
    def was_overridden(self) -> bool:
        return self.override_total is not None
