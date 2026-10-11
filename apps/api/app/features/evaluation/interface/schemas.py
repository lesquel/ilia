from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.features.evaluation.domain.entities import (
    MAX_PROMPT_CHARS,
    Activity,
    Evaluation,
    Submission,
)


class ActivityChecksResponse(BaseModel):
    """The mechanical checks, so the folio margin can light the same notes."""

    requires_role: bool
    requires_format: bool
    min_length: int
    max_length: int
    required_terms: list[list[str]]


class ActivityResponse(BaseModel):
    """The activity as the Lab shows it.

    The rubric travels with it: a teacher should know what they are being
    measured on **before** writing, not discover it in the result (PRD E-06).
    """

    id: UUID
    title: str
    statement: str
    max_attempts: int
    attempts_used: int
    attempts_left: int
    dimensions: list["DimensionResponse"]
    requirements: list[str]
    checks: ActivityChecksResponse
    course_slug: str = ""
    course_title: str = ""

    @classmethod
    def from_entity(cls, activity: Activity, attempts_used: int) -> "ActivityResponse":
        return cls(
            id=activity.id,
            title=activity.title,
            statement=activity.statement,
            max_attempts=activity.max_attempts,
            attempts_used=attempts_used,
            attempts_left=activity.attempts_left(attempts_used),
            dimensions=[
                DimensionResponse(
                    key=dimension.key,
                    name=dimension.name,
                    description=dimension.description,
                    kind=dimension.kind.value,
                    weight=dimension.weight,
                )
                for dimension in activity.rubric.dimensions
            ],
            requirements=_requirements(activity),
            checks=ActivityChecksResponse(
                requires_role=activity.checks.requires_role,
                requires_format=activity.checks.requires_format,
                min_length=activity.checks.min_length,
                max_length=activity.checks.max_length,
                required_terms=activity.checks.required_terms,
            ),
            course_slug=activity.course_slug,
            course_title=activity.course_title,
        )


def _requirements(activity: Activity) -> list[str]:
    """The objective requirements, spelled out.

    Stating them up front is not giving away the answer: these are the things
    the platform measures mechanically, and a teacher who fails one because
    nobody told them has been tricked, not taught.
    """
    checks = activity.checks
    requirements: list[str] = []

    if checks.requires_role:
        requirements.append("Dale al modelo un rol o di para quién es la respuesta.")
    if checks.requires_format:
        requirements.append("Indica en qué formato quieres la respuesta.")
    if checks.min_length:
        requirements.append(f"Escribe al menos {checks.min_length} palabras.")
    if checks.max_length:
        requirements.append(f"No superes las {checks.max_length} palabras.")
    for group in checks.required_terms:
        requirements.append(f"Menciona: {group[0]}.")

    return requirements


class DimensionResponse(BaseModel):
    key: str
    name: str
    description: str
    kind: str
    weight: float


class SubmitPromptRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_CHARS)
    idempotency_key: str | None = Field(default=None, max_length=128)


class SubmissionResponse(BaseModel):
    id: UUID
    activity_id: UUID
    attempt: int
    status: str
    prompt: str
    failure_reason: str | None
    created_at: datetime | None

    @classmethod
    def from_entity(cls, submission: Submission) -> "SubmissionResponse":
        return cls(
            id=submission.id,
            activity_id=submission.activity_id,
            attempt=submission.attempt,
            status=submission.status.value,
            prompt=submission.prompt,
            failure_reason=submission.failure_reason,
            created_at=submission.created_at,
        )


class ScoreResponse(BaseModel):
    key: str
    score: float
    justification: str


class EvaluationResponse(BaseModel):
    total: float
    effective_total: float
    passed: bool
    was_overridden: bool
    # Why it was adjusted, in the instructor's own words. A grade changed for
    # reasons the teacher cannot see is worse than one she can question — the
    # same rule already applied to a revoked certificate, where "revoked" with
    # no reason invites the holder to be assumed guilty of something
    # unspecified.
    override_reason: str | None = None
    rubric_version: int
    dimension_scores: list[ScoreResponse]
    feedback: str
    suggestion: str
    check_failures: list[str]
    model: str
    model_version: str
    generated_text: str = ""

    @classmethod
    def from_entity(cls, evaluation: Evaluation) -> "EvaluationResponse":
        return cls(
            total=evaluation.total,
            effective_total=evaluation.effective_total,
            passed=evaluation.passed,
            was_overridden=evaluation.was_overridden,
            override_reason=evaluation.override_reason,
            rubric_version=evaluation.rubric_version,
            dimension_scores=[
                ScoreResponse(key=score.key, score=score.score, justification=score.justification)
                for score in evaluation.dimension_scores
            ],
            feedback=evaluation.feedback,
            suggestion=evaluation.suggestion,
            check_failures=list(evaluation.check_failures),
            model=evaluation.model,
            model_version=evaluation.model_version,
            generated_text=evaluation.generated_text,
        )


class SubmissionResultResponse(BaseModel):
    """Submission plus its evaluation, if it has one yet.

    One endpoint for both states so the client polls a single URL and does not
    have to guess when to switch.
    """

    submission: SubmissionResponse
    evaluation: EvaluationResponse | None
