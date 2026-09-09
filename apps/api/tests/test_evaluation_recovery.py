"""Picking up evaluations a dead process left behind.

Before this, a restart during an evaluation left the submission `running` for
ever: no feedback, and the attempt already spent. With a real provider taking
seconds per evaluation, that is a deploy away.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app.features.evaluation.domain.entities import (
    MAX_RECOVERIES,
    Submission,
    SubmissionStatus,
)
from app.features.evaluation.infrastructure.queue import (
    ABANDONED_AFTER_SECONDS,
    recover_abandoned,
)

NOW = datetime(2026, 9, 9, 12, 0, tzinfo=UTC)


class FakeSubmissions:
    """Just enough of the repository to drive recovery, with the same rules."""

    def __init__(self, rows: list[Submission]) -> None:
        self.rows = {row.id: row for row in rows}
        self.given_up: dict[UUID, str] = {}

    def _stale(self, older_than: datetime) -> list[Submission]:
        return [
            row
            for row in self.rows.values()
            if row.status in {SubmissionStatus.PENDING, SubmissionStatus.RUNNING}
            and row.updated_at is not None
            and row.updated_at < older_than
        ]

    async def claim_abandoned(self, *, older_than: datetime, limit: int) -> list[UUID]:
        claimed = [r for r in self._stale(older_than) if r.recoveries < MAX_RECOVERIES][:limit]
        for row in claimed:
            row.recoveries += 1
            row.status = SubmissionStatus.PENDING
            row.updated_at = NOW
        return [row.id for row in claimed]

    async def claim_exhausted(self, *, older_than: datetime, limit: int) -> list[UUID]:
        return [r.id for r in self._stale(older_than) if r.recoveries >= MAX_RECOVERIES][:limit]

    async def give_up(self, submission_id: UUID, *, reason: str) -> None:
        self.given_up[submission_id] = reason
        self.rows[submission_id].status = SubmissionStatus.FAILED


class FakeQueue:
    def __init__(self) -> None:
        self.enqueued: list[UUID] = []

    async def enqueue(self, submission_id: UUID) -> None:
        self.enqueued.append(submission_id)


def submission(*, status: SubmissionStatus, age_seconds: float, recoveries: int = 0) -> Submission:
    return Submission(
        id=uuid4(),
        activity_id=uuid4(),
        user_id=uuid4(),
        prompt="Armá una guía de fracciones.",
        attempt=1,
        status=status,
        recoveries=recoveries,
        updated_at=NOW - timedelta(seconds=age_seconds),
    )


class TestRecovery:
    @pytest.mark.asyncio
    async def test_an_abandoned_submission_is_picked_back_up(self) -> None:
        stranded = submission(status=SubmissionStatus.RUNNING, age_seconds=3600)
        repo, queue = FakeSubmissions([stranded]), FakeQueue()

        recovered = await recover_abandoned(repo, queue, now=NOW)  # type: ignore[arg-type]

        assert recovered == 1
        assert queue.enqueued == [stranded.id]

    @pytest.mark.asyncio
    async def test_work_a_sibling_replica_is_still_doing_is_left_alone(self) -> None:
        # Claiming a submission another process is mid-way through would run the
        # evaluation twice and bill for both.
        fresh = submission(status=SubmissionStatus.RUNNING, age_seconds=5)
        repo, queue = FakeSubmissions([fresh]), FakeQueue()

        assert await recover_abandoned(repo, queue, now=NOW) == 0  # type: ignore[arg-type]
        assert queue.enqueued == []

    @pytest.mark.asyncio
    async def test_finished_work_is_never_re_run(self) -> None:
        done = [
            submission(status=SubmissionStatus.SCORED, age_seconds=9999),
            submission(status=SubmissionStatus.FAILED, age_seconds=9999),
        ]
        repo, queue = FakeSubmissions(done), FakeQueue()

        assert await recover_abandoned(repo, queue, now=NOW) == 0  # type: ignore[arg-type]

    @pytest.mark.asyncio
    async def test_retries_are_bounded_and_end_in_an_honest_failure(self) -> None:
        """A submission that kills the worker must not be retried for ever.

        Each retry is a real model call. After the budget, the teacher gets a
        failure they can act on instead of a spinner that never resolves.
        """
        poisoned = submission(
            status=SubmissionStatus.RUNNING, age_seconds=3600, recoveries=MAX_RECOVERIES
        )
        repo, queue = FakeSubmissions([poisoned]), FakeQueue()

        await recover_abandoned(repo, queue, now=NOW)  # type: ignore[arg-type]

        assert queue.enqueued == []
        assert poisoned.status is SubmissionStatus.FAILED
        assert "no pudo completarse" in repo.given_up[poisoned.id]

    @pytest.mark.asyncio
    async def test_the_recovery_counter_climbs_so_the_budget_is_real(self) -> None:
        stranded = submission(status=SubmissionStatus.RUNNING, age_seconds=3600)
        repo, queue = FakeSubmissions([stranded]), FakeQueue()

        await recover_abandoned(repo, queue, now=NOW)  # type: ignore[arg-type]

        assert stranded.recoveries == 1

    @pytest.mark.asyncio
    async def test_the_staleness_window_is_the_documented_one(self) -> None:
        just_inside = submission(
            status=SubmissionStatus.RUNNING, age_seconds=ABANDONED_AFTER_SECONDS - 1
        )
        just_outside = submission(
            status=SubmissionStatus.RUNNING, age_seconds=ABANDONED_AFTER_SECONDS + 1
        )
        repo, queue = FakeSubmissions([just_inside, just_outside]), FakeQueue()

        await recover_abandoned(repo, queue, now=NOW)  # type: ignore[arg-type]

        assert queue.enqueued == [just_outside.id]
