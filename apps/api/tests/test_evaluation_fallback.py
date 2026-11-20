"""Degrading to a second provider when the primary one is down.

The orchestration under test: execute → judge on the primary engine; if either
step fails because the *provider* is unavailable, rerun both steps on the
fallback engine; if that fails too, the submission ends as `failed` with both
causes recorded. Failures the prompt itself can provoke never reach the
fallback.
"""

from typing import Any

import httpx
import pytest

from app.core.config import Settings
from app.features.evaluation.domain.entities import Activity, ModelOutput, SubmissionStatus
from app.features.evaluation.domain.errors import ProviderUnavailableError
from app.features.evaluation.domain.ports import (
    EvaluationEngine,
    JudgeVerdict,
    UntrustedPrompt,
)
from app.features.evaluation.domain.rubric import Rubric
from app.features.evaluation.infrastructure.llm import (
    LlmError,
    LlmResponseInvalidError,
    LlmUnavailableError,
    ProviderMisconfiguredError,
    build_fallback_llm_client,
    selected_fallback_llm_name,
)
from app.features.evaluation.infrastructure.llm.gemini import GeminiClient
from app.features.evaluation.infrastructure.llm.openai_compatible import OpenAiCompatibleClient
from tests.evaluation_fakes import CompliantJudge, EchoExecutor, build_run_evaluation, submit
from tests.test_evaluation_injection import activity_with, rubric_with

PROMPT = "Actuá como docente y armá 5 ejercicios en una tabla."


class DownExecutor(EchoExecutor):
    """An executor whose provider is unreachable."""

    async def execute(self, prompt: UntrustedPrompt, *, max_output_tokens: int) -> ModelOutput:
        raise ProviderUnavailableError("provider unreachable")


class NamedJudge(CompliantJudge):
    """A judge that reports which provider it stands for."""

    def __init__(self, model: str, *, fail: Exception | None = None) -> None:
        super().__init__()
        self._model = model
        self._fail = fail
        self.calls = 0

    async def judge(
        self, *, statement: str, prompt: UntrustedPrompt, output: str, rubric: Rubric
    ) -> JudgeVerdict:
        self.calls += 1
        if self._fail is not None:
            raise self._fail
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
            executor=DownExecutor(),
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
            judge=NamedJudge("primary", fail=ProviderUnavailableError("timeout")),
            fallback=EvaluationEngine(backup_executor, NamedJudge("backup")),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        evaluation = await run.execute(submission.id)

        assert evaluation is not None and evaluation.model == "backup"
        assert backup_executor.received == [PROMPT]

    async def test_both_down_fails_honestly_with_both_causes(self, activity: Activity) -> None:
        run, repos = build_run_evaluation(
            activity,
            executor=DownExecutor(),
            judge=NamedJudge("primary"),
            fallback=EvaluationEngine(
                EchoExecutor(), NamedJudge("backup", fail=ProviderUnavailableError("timeout"))
            ),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        assert await run.execute(submission.id) is None

        stored = await repos.submissions.get(submission.id)
        assert stored.status is SubmissionStatus.FAILED
        assert (
            stored.failure_reason == "ProviderUnavailableError; fallback: ProviderUnavailableError"
        )
        assert await repos.evaluations.get_for_submission(submission.id) is None

    async def test_a_content_derived_failure_never_reaches_the_fallback(
        self, activity: Activity
    ) -> None:
        # A prompt crafted to break the judge's JSON must not buy a second
        # grader: that would let a teacher shop for a better mark.
        backup_judge = NamedJudge("backup")
        run, repos = build_run_evaluation(
            activity,
            executor=EchoExecutor(),
            judge=NamedJudge("primary", fail=LlmResponseInvalidError("bad verdict")),
            fallback=EvaluationEngine(EchoExecutor(), backup_judge),
        )
        submission = await submit(repos, activity, prompt=PROMPT)

        assert await run.execute(submission.id) is None
        assert backup_judge.calls == 0
        stored = await repos.submissions.get(submission.id)
        assert stored.status is SubmissionStatus.FAILED
        assert stored.failure_reason == "LlmResponseInvalidError"

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


class TestFailureClassification:
    """Which provider answers count as "unavailable" and may use the fallback."""

    @staticmethod
    async def call(status: int) -> None:
        def handle(request: httpx.Request) -> httpx.Response:
            return httpx.Response(status, json={"error": "x"})

        client = OpenAiCompatibleClient(api_key="k", model="m", base_url="https://x/v1")
        await client.complete(
            system="s", user="u", max_output_tokens=10, transport=httpx.MockTransport(handle)
        )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status", [401, 403])
    async def test_credential_rejections_are_unavailability(self, status: int) -> None:
        with pytest.raises(LlmUnavailableError):
            await self.call(status)

    @pytest.mark.asyncio
    async def test_exhausted_server_errors_are_unavailability(self) -> None:
        with pytest.raises(LlmUnavailableError):
            await self.call(503)

    @pytest.mark.asyncio
    async def test_a_bad_request_is_not_unavailability(self) -> None:
        # A 400 can be a content refusal the prompt provoked.
        with pytest.raises(LlmError) as caught:
            await self.call(400)
        assert not isinstance(caught.value, ProviderUnavailableError)

    @pytest.mark.asyncio
    async def test_an_unreachable_host_is_unavailability(self) -> None:
        def handle(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("refused")

        client = OpenAiCompatibleClient(api_key="k", model="m", base_url="https://x/v1")
        with pytest.raises(LlmUnavailableError):
            await client.complete(
                system="s", user="u", max_output_tokens=10, transport=httpx.MockTransport(handle)
            )
