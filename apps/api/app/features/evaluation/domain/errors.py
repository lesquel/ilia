from app.shared.errors import (
    ConflictError,
    NotFoundError,
    QuotaExceededError,
    ValidationError,
)


class ActivityNotFoundError(NotFoundError):
    code = "activity_not_found"

    def __init__(self) -> None:
        super().__init__("That activity does not exist")


class SubmissionNotFoundError(NotFoundError):
    code = "submission_not_found"

    def __init__(self) -> None:
        super().__init__("That submission does not exist")


class NoAttemptsLeftError(ConflictError):
    code = "no_attempts_left"

    def __init__(self, max_attempts: int) -> None:
        super().__init__(
            "You have used every attempt for this activity",
            detail={"max_attempts": max_attempts},
        )


class EvaluationQuotaExceededError(QuotaExceededError):
    """Out of evaluations for the period.

    Its own error because it is the main lever of the free tier (PRD 11): the
    client has to be able to tell "you ran out of your monthly quota" apart from
    "something broke", and only one of those is worth showing an upgrade for.
    """

    code = "evaluation_quota_exceeded"

    def __init__(self) -> None:
        super().__init__("You have used up your evaluations for this period")


class PromptTooLongError(ValidationError):
    code = "prompt_too_long"

    def __init__(self, limit: int) -> None:
        super().__init__(f"The prompt cannot exceed {limit} characters", detail={"limit": limit})


class EmptyPromptError(ValidationError):
    code = "empty_prompt"

    def __init__(self) -> None:
        super().__init__("Write a prompt before submitting")
