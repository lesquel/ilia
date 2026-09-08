"""Running evaluations out of band.

**This is the honest, temporary implementation.** TRD 5.2 leaves the queue
technology open — Celery, RQ, Dramatiq, or a managed one — and that decision has
not been made. Until it is, evaluations run as asyncio tasks inside the API
process.

What that buys: the HTTP request returns immediately, the client polls, and the
whole async contract the app is built against is real (TRD 3).

What it does not survive: a restart. A submission that was mid-flight when the
process died stays `running` forever. That is acceptable for a pilot and
unacceptable at municipal scale, which is why the port exists — a real broker
implements `EvaluationQueue` and nothing else changes.
"""

import asyncio
from collections.abc import Awaitable, Callable
from uuid import UUID

import structlog

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
