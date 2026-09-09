"""In-memory evaluation repositories, for fast tests and a database-less boot."""

from datetime import datetime
from uuid import UUID

from app.features.evaluation.domain.entities import (
    Activity,
    Evaluation,
    Submission,
    SubmissionStatus,
)


class InMemoryActivityRepository:
    def __init__(self, activities: list[Activity] | None = None) -> None:
        self._activities = list(activities or [])

    async def get(self, activity_id: UUID) -> Activity | None:
        return next((item for item in self._activities if item.id == activity_id), None)

    async def get_by_module(self, module_id: UUID) -> list[Activity]:
        return [item for item in self._activities if item.module_id == module_id]


class InMemorySubmissionRepository:
    def __init__(self) -> None:
        self._submissions: dict[UUID, Submission] = {}

    async def add(self, submission: Submission) -> None:
        self._submissions[submission.id] = submission

    async def get(self, submission_id: UUID) -> Submission | None:
        return self._submissions.get(submission_id)

    async def update(self, submission: Submission) -> None:
        self._submissions[submission.id] = submission

    async def count_attempts(self, *, user_id: UUID, activity_id: UUID) -> int:
        # Mirrors the SQL rule: our failures are not the teacher's attempts.
        spent = await self.list_for_activity(user_id=user_id, activity_id=activity_id)
        return sum(1 for item in spent if item.status is not SubmissionStatus.FAILED)

    async def list_for_activity(self, *, user_id: UUID, activity_id: UUID) -> list[Submission]:
        return sorted(
            (
                item
                for item in self._submissions.values()
                if item.user_id == user_id and item.activity_id == activity_id
            ),
            key=lambda item: item.attempt,
        )

    async def claim_abandoned(self, *, older_than: datetime, limit: int) -> list[UUID]:
        """No-op in memory: nothing survives the process, so nothing is abandoned.

        Returning an empty list rather than raising keeps the recovery path
        exercised in tests without inventing a fake concept of staleness for a
        store that dies with the process anyway.
        """
        return []

    async def claim_exhausted(self, *, older_than: datetime, limit: int) -> list[UUID]:
        return []

    async def give_up(self, submission_id: UUID, *, reason: str) -> None:
        submission = self._submissions.get(submission_id)
        if submission is None:
            return
        submission.status = SubmissionStatus.FAILED
        submission.failure_reason = reason[:120]


class InMemoryEvaluationRepository:
    def __init__(self) -> None:
        self._evaluations: dict[UUID, Evaluation] = {}

    async def add(self, evaluation: Evaluation) -> None:
        self._evaluations[evaluation.submission_id] = evaluation

    async def get_for_submission(self, submission_id: UUID) -> Evaluation | None:
        return self._evaluations.get(submission_id)


class InMemoryUsageRecorder:
    def __init__(self) -> None:
        self.records: list[dict[str, object]] = []

    async def record(
        self,
        *,
        user_id: UUID,
        submission_id: UUID,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        self.records.append(
            {
                "user_id": user_id,
                "submission_id": submission_id,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }
        )


class UnlimitedQuota:
    """No limit. The free-tier numbers are still open (PRD open question 4), so
    this is what the platform runs on until they are decided."""

    async def remaining(self, user_id: UUID) -> int | None:
        return None

    async def consume(self, user_id: UUID) -> None:
        return None


class FixedQuota:
    """A simple per-period allowance, for testing the free tier's behaviour."""

    def __init__(self, allowance: int) -> None:
        self._allowance = allowance
        self._used: dict[UUID, int] = {}

    async def remaining(self, user_id: UUID) -> int | None:
        return self._allowance - self._used.get(user_id, 0)

    async def consume(self, user_id: UUID) -> None:
        self._used[user_id] = self._used.get(user_id, 0) + 1
