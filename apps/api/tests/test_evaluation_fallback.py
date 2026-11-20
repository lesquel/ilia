"""Degrading to a second provider when the primary one is down.

The orchestration under test: execute → judge on the primary engine; if either
step fails, rerun *both* on the fallback engine; if that fails too, the
submission ends as `failed` with both causes recorded.
"""

from typing import Any

import pytest

from app.core.config import Settings
from app.features.evaluation.domain.entities import Activity, SubmissionStatus
from app.features.evaluation.domain.ports import (
    EvaluationEngine,
    JudgeVerdict,
    UntrustedPrompt,
)
from app.features.evaluation.domain.rubric import Rubric
from app.features.evaluation.infrastructure.llm import (
    ProviderMisconfiguredError,
    build_fallback_llm_client,
    selected_fallback_llm_name,
)
from app.features.evaluation.infrastructure.llm.gemini import GeminiClient
from tests.evaluation_fakes import CompliantJudge, EchoExecutor, build_run_evaluation, submit
from tests.test_evaluation_injection import activity_with, rubric_with

PROMPT = "Actuá como docente y armá 5 ejercicios en una tabla."


class NamedJudge(CompliantJudge):
    """A judge that reports which provider it stands for."""

    def __init__(self, model: str, *, fail: bool = False) -> None:
        super().__init__()
        self._model = model
        self._fail = fail
        self.calls = 0

    async def judge(
        self, *, statement: str, prompt: UntrustedPrompt, output: str, rubric: Rubric
    ) -> JudgeVerdict:
        self.calls += 1
        if self._fail:
            raise TimeoutError("judge unavailable")
        verdict = await super().judge(
            statement=statement, prompt=prompt, output=output, rubric=rubric
        )
        return JudgeVerdict(
            scores=verdict.scores,
            feedback=verdict.feedback,
            suggestion=verdict.suggestion,
            model=self._model,
            model_version="1",
            input_tokens=verdict.input_tokens,
            output_tokens=verdict.output_tokens,
        )


@pytest.fixture
def activity() -> Activity:
    return activity_with(rubric_with("claridad"))


class TestOrchestration:
    async def test_primary_healthy_never_touches_the_fallback(self, activity: Activity) -> None:
        backup_executor, backup_judge = EchoExecutor(), NamedJudge("backup")
        run, repos = build_run_evaluation(
            activity,
            executor=EchoExecutor(),
            judge=NamedJudge("primary"),
            fallback=EvaluationEngine(backup_executor, backup_judge),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        evaluation = await run.execute(submission.id)

        assert evaluation is not None
        assert evaluation.model == "primary"
        assert backup_executor.received == [] and backup_judge.calls == 0
        assert (await repos.submissions.get(submission.id)).status is SubmissionStatus.SCORED

    async def test_primary_down_degrades_to_the_fallback(self, activity: Activity) -> None:
        run, repos = build_run_evaluation(
            activity,
            executor=EchoExecutor(fail=True),
            judge=NamedJudge("primary"),
            fallback=EvaluationEngine(EchoExecutor(), NamedJudge("backup")),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        evaluation = await run.execute(submission.id)

        assert evaluation is not None
        # The grade says who produced it: a degraded mark stays explainable.
        assert evaluation.model == "backup"
        stored = await repos.submissions.get(submission.id)
        assert stored.status is SubmissionStatus.SCORED
        assert stored.failure_reason is None
        assert repos.usage.records[0]["model"] == "backup"

    async def test_a_failing_judge_reruns_execution_on_the_fallback_too(
        self, activity: Activity
    ) -> None:
        # Never "primary output, fallback judge": both steps move together.
        backup_executor = EchoExecutor()
        run, repos = build_run_evaluation(
            activity,
            executor=EchoExecutor(),
            judge=NamedJudge("primary", fail=True),
            fallback=EvaluationEngine(backup_executor, NamedJudge("backup")),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        evaluation = await run.execute(submission.id)

        assert evaluation is not None and evaluation.model == "backup"
        assert backup_executor.received == [PROMPT]

    async def test_both_down_fails_honestly_with_both_causes(self, activity: Activity) -> None:
        run, repos = build_run_evaluation(
            activity,
            executor=EchoExecutor(fail=True),
            judge=NamedJudge("primary"),
            fallback=EvaluationEngine(EchoExecutor(), NamedJudge("backup", fail=True)),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        assert await run.execute(submission.id) is None

        stored = await repos.submissions.get(submission.id)
        assert stored.status is SubmissionStatus.FAILED
        assert stored.failure_reason == "RuntimeError; fallback: TimeoutError"
        assert await repos.evaluations.get_for_submission(submission.id) is None

    async def test_without_fallback_the_old_behaviour_is_unchanged(
        self, activity: Activity
    ) -> None:
        run, repos = build_run_evaluation(
            activity,
            executor=EchoExecutor(fail=True),
            judge=NamedJudge("primary"),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        assert await run.execute(submission.id) is None
        stored = await repos.submissions.get(submission.id)
        assert stored.status is SubmissionStatus.FAILED
        assert stored.failure_reason == "RuntimeError"


class TestFallbackConfiguration:
    def make(self, **over: Any) -> Settings:
        return Settings(**over)

    def test_no_fallback_by_default(self) -> None:
        settings = self.make(llm_provider="anthropic", llm_api_key="k")
        assert build_fallback_llm_client(settings) is None
        assert selected_fallback_llm_name(settings) is None

    def test_builds_the_named_fallback(self) -> None:
        settings = self.make(
            llm_provider="anthropic",
            llm_api_key="k",
            llm_fallback_provider=" Gemini ",
            llm_fallback_api_key="k2",
        )
        assert isinstance(build_fallback_llm_client(settings), GeminiClient)
        assert selected_fallback_llm_name(settings) == "gemini"

    def test_a_fallback_without_a_key_fails_at_startup_naming_its_variable(self) -> None:
        settings = self.make(
            llm_provider="anthropic", llm_api_key="k", llm_fallback_provider="gemini"
        )
        with pytest.raises(ProviderMisconfiguredError, match="ILIA_LLM_FALLBACK_API_KEY"):
            build_fallback_llm_client(settings)

    def test_a_fallback_behind_the_stub_is_refused(self) -> None:
        settings = self.make(llm_fallback_provider="gemini", llm_fallback_api_key="k2")
        with pytest.raises(ProviderMisconfiguredError, match="ILIA_LLM_PROVIDER is empty"):
            build_fallback_llm_client(settings)
