"""Turning configuration into a provider.

The whole point of the port is that this is the only file that knows which
providers exist. Nothing in `domain` or `application` changes when a fifth one
is added here.
"""

from enum import StrEnum

import structlog

from app.core.config import Settings
from app.features.evaluation.infrastructure.llm.anthropic import AnthropicClient
from app.features.evaluation.infrastructure.llm.base import LlmClient
from app.features.evaluation.infrastructure.llm.gemini import GeminiClient
from app.features.evaluation.infrastructure.llm.openai_compatible import (
    DEEPSEEK_BASE_URL,
    OPENAI_BASE_URL,
    OpenAiCompatibleClient,
)

logger = structlog.get_logger()


class Provider(StrEnum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"
    # Anything else speaking the Chat Completions protocol: a gateway, a
    # self-hosted model, a provider we have not met yet. Requires `llm_base_url`.
    OPENAI_COMPATIBLE = "openai-compatible"


# A default so a deployment can name a provider without also having to pick a
# model. Deliberately a current, mid-tier model in each family: judging a prompt
# is a small structured task, and the flagship costs several times more for work
# it is not better at. Override with `ILIA_LLM_MODEL`.
DEFAULT_MODELS: dict[Provider, str] = {
    Provider.ANTHROPIC: "claude-sonnet-4-5",
    Provider.OPENAI: "gpt-4o-mini",
    Provider.GEMINI: "gemini-2.0-flash",
    Provider.DEEPSEEK: "deepseek-chat",
}


class ProviderMisconfiguredError(ValueError):
    """The configuration names a provider that cannot be built from it.

    Raised at startup rather than on the first submission. A missing API key
    that surfaces when a teacher presses "Enviar a evaluación" costs them an
    attempt and tells them nothing.
    """


def build_llm_client(settings: Settings) -> LlmClient | None:
    """The configured client, or None to run the local stub.

    None is a legitimate configuration — it is how the project has run until
    now — so it is returned rather than raised. Naming a provider and getting
    it wrong is not.
    """
    name = settings.llm_provider.strip().lower()
    if not name:
        return None

    try:
        provider = Provider(name)
    except ValueError as exc:
        supported = ", ".join(sorted(p.value for p in Provider))
        raise ProviderMisconfiguredError(
            f"Unknown ILIA_LLM_PROVIDER {name!r}. Supported: {supported}"
        ) from exc

    api_key = settings.llm_api_key.strip()
    if not api_key:
        raise ProviderMisconfiguredError(
            f"ILIA_LLM_PROVIDER is {provider.value!r} but ILIA_LLM_API_KEY is empty"
        )

    model = settings.llm_model.strip() or DEFAULT_MODELS.get(provider, "")
    if not model:
        raise ProviderMisconfiguredError(
            f"ILIA_LLM_MODEL is required for provider {provider.value!r}"
        )

    base_url = settings.llm_base_url.strip()

    # The provider and model are logged; the key never is, not even truncated.
    # A prefix is enough to identify which key leaked and which account to bill.
    logger.info("llm_provider_configured", provider=provider.value, model=model)

    if provider is Provider.ANTHROPIC:
        return AnthropicClient(api_key=api_key, model=model)

    if provider is Provider.GEMINI:
        return GeminiClient(api_key=api_key, model=model)

    if provider is Provider.OPENAI:
        return OpenAiCompatibleClient(
            api_key=api_key, model=model, base_url=base_url or OPENAI_BASE_URL, provider="openai"
        )

    if provider is Provider.DEEPSEEK:
        return OpenAiCompatibleClient(
            api_key=api_key,
            model=model,
            base_url=base_url or DEEPSEEK_BASE_URL,
            provider="deepseek",
        )

    if not base_url:
        raise ProviderMisconfiguredError(
            "ILIA_LLM_BASE_URL is required for provider 'openai-compatible'"
        )

    return OpenAiCompatibleClient(
        api_key=api_key, model=model, base_url=base_url, provider="openai-compatible"
    )
