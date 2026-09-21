"""Reference EVAL suite for the prompting lab (issue #5).

Runs in CI only when `ILIA_EVAL_REFERENCE=1`. Without LLM secrets every test
skips cleanly so the default pipeline stays green. With secrets configured, the
job fails if evaluation would use `local-stub` instead of a real provider.
"""

import os
from uuid import uuid4

import pytest

from app.content.eval_gold_set import (
    GOLD_EVAL_CASES,
    PROMPTING_LAB_CHECKS,
    PROMPTING_LAB_RUBRIC,
    PROMPTING_LAB_STATEMENT,
    GoldEvalCase,
)
from app.core.config import Settings
from app.features.auth.infrastructure.security import SystemClock
from app.features.evaluation.application.use_cases import RunEvaluation, SubmitPrompt
from app.features.evaluation.domain.checks import run_checks
from app.features.evaluation.domain.entities import Activity
from app.features.evaluation.infrastructure.llm import (
    LlmPromptExecutor,
    LlmPromptJudge,
    build_llm_client,
)
from app.features.evaluation.infrastructure.llm.registry import STUB_LLM_NAME, selected_llm_name
from app.features.evaluation.infrastructure.memory_repository import (
    InMemoryActivityRepository,
    InMemoryEvaluationRepository,
    InMemorySubmissionRepository,
    InMemoryUsageRecorder,
    UnlimitedQuota,
)
from app.features.evaluation.infrastructure.queue import InProcessEvaluationQueue
from tests.evaluation_fakes import TEACHER


def reference_suite_requested() -> bool:
    return os.environ.get("ILIA_EVAL_REFERENCE", "").strip() == "1"


def _real_llm_configured(settings: Settings) -> bool:
    return bool(settings.llm_api_key.strip()) and selected_llm_name(settings) != STUB_LLM_NAME


@pytest.fixture
def reference_settings(settings: Settings) -> Settings:
    if not reference_suite_requested():
        pytest.skip("Set ILIA_EVAL_REFERENCE=1 to run the reference suite")
    return settings


class TestGoldSetFixture:
    def test_the_reference_set_has_a_sane_size(self) -> None:
        assert 5 <= len(GOLD_EVAL_CASES) <= 8

    def test_obviously_weak_prompts_fail_deterministic_checks(self) -> None:
        """Cheap guard that does not call a provider."""
        must_fail = {"vague-one-liner", "missing-five-pieces", "injection-attempt"}
        for case in GOLD_EVAL_CASES:
            if case.id not in must_fail:
                continue
            outcome = run_checks(case.prompt, PROMPTING_LAB_CHECKS)
            assert outcome.failures, case.id


class TestReferenceSuiteProvider:
    def test_without_secrets_the_job_skips_instead_of_failing(
        self, reference_settings: Settings
    ) -> None:
        if _real_llm_configured(reference_settings):
            pytest.skip("Secrets present; use the scoring test instead")
        pytest.skip("No ILIA_LLM_API_KEY / real provider — reference scoring skipped")

    def test_with_secrets_the_real_eval_path_must_not_use_the_stub(
        self, reference_settings: Settings
    ) -> None:
        if not reference_settings.llm_api_key.strip():
            pytest.skip("No ILIA_LLM_API_KEY — reference scoring skipped")

        provider = selected_llm_name(reference_settings)
        assert provider != STUB_LLM_NAME, (
            "ILIA_EVAL_REFERENCE is set and ILIA_LLM_API_KEY is present, but "
            "evaluation would still grade with local-stub. Configure ILIA_LLM_PROVIDER."
        )


def _activity_for(case: GoldEvalCase) -> Activity:
    return Activity(
        id=uuid4(),
        module_id=uuid4(),
        course_id=uuid4(),
        title="Gold reference",
        statement=PROMPTING_LAB_STATEMENT,
        rubric=PROMPTING_LAB_RUBRIC,
        checks=PROMPTING_LAB_CHECKS,
    )


@pytest.mark.asyncio
class TestReferenceSuiteScoring:
    async def test_gold_prompts_score_within_human_baseline_bands(
        self, reference_settings: Settings
    ) -> None:
        if not _real_llm_configured(reference_settings):
            pytest.skip("No real LLM configured — reference scoring skipped")

        client = build_llm_client(reference_settings)
        assert client is not None

        executor = LlmPromptExecutor(client)
        judge = LlmPromptJudge(client)
        clock = SystemClock()

        for case in GOLD_EVAL_CASES:
            activity = _activity_for(case)
            activities = InMemoryActivityRepository([activity])
            submissions = InMemorySubmissionRepository()
            evaluations = InMemoryEvaluationRepository()
            usage = InMemoryUsageRecorder()
            queue = InProcessEvaluationQueue(lambda _sid: None)

            run = RunEvaluation(
                activities=activities,
                submissions=submissions,
                evaluations=evaluations,
                executor=executor,
                judge=judge,
                usage=usage,
                clock=clock,
            )
            queue = InProcessEvaluationQueue(run.execute)

            submission = await SubmitPrompt(
                activities=activities,
                submissions=submissions,
                quota=UnlimitedQuota(),
                queue=queue,
                clock=clock,
            ).execute(user_id=TEACHER, activity_id=activity.id, prompt=case.prompt)

            await queue.drain()
            evaluation = await evaluations.get_for_submission(submission.id)

            assert evaluation is not None, case.id
            assert evaluation.model != STUB_LLM_NAME, case.id
            assert case.reference_total_min <= evaluation.total <= case.reference_total_max, (
                f"{case.id}: total {evaluation.total} outside "
                f"[{case.reference_total_min}, {case.reference_total_max}]"
            )
            assert evaluation.passed is case.reference_passed, (
                f"{case.id}: expected passed={case.reference_passed}, got {evaluation.passed}"
            )
