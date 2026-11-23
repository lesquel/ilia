"""LLM provider adapters.

One protocol (`LlmClient`), one executor, one judge, and a small adapter per
provider. Adding a provider means one file and one branch in `registry`.
"""

from app.features.evaluation.infrastructure.llm.base import (
    LlmClient,
    LlmError,
    LlmResponse,
    LlmResponseInvalidError,
    LlmUnavailableError,
)
from app.features.evaluation.infrastructure.llm.executor import LlmPromptExecutor
from app.features.evaluation.infrastructure.llm.judge import LlmPromptJudge
from app.features.evaluation.infrastructure.llm.registry import (
    DEFAULT_MODELS,
    STUB_LLM_NAME,
    Provider,
    ProviderMisconfiguredError,
    build_fallback_llm_client,
    build_llm_client,
    selected_fallback_llm_name,
    selected_llm_name,
)

__all__ = [
    "DEFAULT_MODELS",
    "STUB_LLM_NAME",
    "LlmClient",
    "LlmError",
    "LlmPromptExecutor",
    "LlmPromptJudge",
    "LlmResponse",
    "LlmResponseInvalidError",
    "LlmUnavailableError",
    "Provider",
    "ProviderMisconfiguredError",
    "build_fallback_llm_client",
    "build_llm_client",
    "selected_fallback_llm_name",
    "selected_llm_name",
]
