"""LLM provider adapters.

One protocol (`LlmClient`), one executor, one judge, and a small adapter per
provider. Adding a provider means one file and one branch in `registry`.
"""

from app.features.evaluation.infrastructure.llm.base import (
    LlmClient,
    LlmError,
    LlmResponse,
    LlmResponseInvalidError,
)
from app.features.evaluation.infrastructure.llm.executor import LlmPromptExecutor
from app.features.evaluation.infrastructure.llm.judge import LlmPromptJudge
from app.features.evaluation.infrastructure.llm.registry import (
    DEFAULT_MODELS,
    Provider,
    ProviderMisconfiguredError,
    build_llm_client,
)

__all__ = [
    "DEFAULT_MODELS",
    "LlmClient",
    "LlmError",
    "LlmPromptExecutor",
    "LlmPromptJudge",
    "LlmResponse",
    "LlmResponseInvalidError",
    "Provider",
    "ProviderMisconfiguredError",
    "build_llm_client",
]
