"""Running evaluations out of band.

**This is the honest, temporary implementation.** TRD 5.2 leaves the queue
technology open — Celery, RQ, Dramatiq, or a managed one — and that decision has
not been made. Until it is, evaluations run as asyncio tasks inside the API
process.

What that buys: the HTTP request returns immediately, the client polls, and the
whole async contract the app is built against is real (TRD 3).

What it does not survive on its own: a restart. So `recover_abandoned` runs at
startup and picks up what a dead process left behind — because with a real
provider an evaluation takes seconds, and a deploy at the wrong moment would
otherwise leave a teacher with no feedback and a spent attempt.

That recovery is deliberately conservative: it claims rows atomically so two
replicas cannot both run the same evaluation, and it gives up after a few
attempts rather than retrying a poisoned submission for ever. A real broker
implements `EvaluationQueue` and nothing else changes.
"""

import asyncio
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from uuid import UUID

import structlog

from app.features.evaluation.domain.ports import EvaluationQueue, SubmissionRepository

logger = structlog.get_logger()


class InProcessEvaluationQueue:
    def __init__(self, runner: Callable[[UUID], Awaitable[object]]) -> None:
        self._runner = runner
        # Strong references, so a task is not garbage-collected mid-flight —
        # asyncio only keeps weak ones, and a dropped task fails silently.
        self._tasks: set[asyncio.Task[object]] = set()

    async def enqueue(self, submission_id: UUID) -> None:
        task = asyncio.create_task(self._run(submission_id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _run(self, submission_id: UUID) -> None:
        try:
            await self._runner(submission_id)
        except Exception:
            # `RunEvaluation` already records provider failures on the
            # submission. Anything reaching here is a bug in our own code, and
            # it must not take the task down silently.
            logger.exception("evaluation_task_crashed", submission_id=str(submission_id))

    async def drain(self) -> None:
        """Wait for in-flight evaluations. Used by tests and at shutdown."""
        if self._tasks:
            await asyncio.gather(*list(self._tasks), return_exceptions=True)


# How long a submission must sit untouched before it is presumed abandoned.
# Comfortably longer than a slow evaluation: claiming one that a sibling replica
# is still working on would run it twice and bill for both.
ABANDONED_AFTER_SECONDS = 300


async def recover_abandoned(
    submissions: SubmissionRepository,
    queue: EvaluationQueue,
    *,
    now: datetime | None = None,
    limit: int = 100,
) -> int:
    """Re-enqueue what a dead process left mid-flight. Returns how many.

    Called once at startup. Submissions already recovered too many times are
    failed instead: each retry costs a real model call, and a submission that
    kills the worker every time will not be fixed by a fourth attempt.
    """
    moment = now or datetime.now(UTC)
    cutoff = moment - timedelta(seconds=ABANDONED_AFTER_SECONDS)

    claimed = await submissions.claim_abandoned(older_than=cutoff, limit=limit)
    for submission_id in claimed:
        await queue.enqueue(submission_id)

    if claimed:
        logger.info("evaluations_recovered", count=len(claimed))

    # Anything still stuck and out of retries is closed honestly, so the teacher
    # sees a failure they can act on instead of a spinner that never resolves.
    exhausted = await submissions.claim_exhausted(older_than=cutoff, limit=limit)
    for submission_id in exhausted:
        await submissions.give_up(
            submission_id,
            reason="La evaluación no pudo completarse tras varios intentos",
        )

    if exhausted:
        logger.warning("evaluations_given_up", count=len(exhausted))

    return len(claimed)
