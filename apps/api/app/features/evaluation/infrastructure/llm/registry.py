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

# What `/health/ready` reports when evaluation is running the local stub.
# Must match `local_provider.MODEL_NAME`: the operator check is this string.
STUB_LLM_NAME = "local-stub"


class ProviderMisconfiguredError(ValueError):
    """The configuration names a provider that cannot be built from it.

    Raised at startup rather than on the first submission. A missing API key
    that surfaces when a teacher presses "Enviar a evaluación" costs them an
    attempt and tells them nothing.
    """


# Which environment variables a role reads. The fallback mirrors the primary
# one-for-one, so an error message can name the exact variable to fix.
PRIMARY_PREFIX = "ILIA_LLM"
FALLBACK_PREFIX = "ILIA_LLM_FALLBACK"


def selected_llm_name(settings: Settings) -> str:
    """The provider evaluation will grade with, after the same strip/lower
    `build_llm_client` uses. Empty or whitespace is the local stub.
    """
    return settings.llm_provider.strip().lower() or STUB_LLM_NAME


def selected_fallback_llm_name(settings: Settings) -> str | None:
    """The provider used when the primary fails, or None when there is none."""
    return settings.llm_fallback_provider.strip().lower() or None


def build_llm_client(settings: Settings) -> LlmClient | None:
    """The configured client, or None to run the local stub.

    None is a legitimate configuration — it is how the project has run until
    now — so it is returned rather than raised. Naming a provider and getting
    it wrong is not.
    """
    name = selected_llm_name(settings)
    if name == STUB_LLM_NAME:
        return None

    return _build(
        name=name,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        base_url=settings.llm_base_url,
        prefix=PRIMARY_PREFIX,
    )


def build_fallback_llm_client(settings: Settings) -> LlmClient | None:
    """The secondary client, or None when no fallback is configured.

    Validated at startup exactly like the primary: a fallback that only reveals
    its missing key during an outage is a fallback that was never there.
    """
    name = selected_fallback_llm_name(settings)
    if name is None:
        return None

    if selected_llm_name(settings) == STUB_LLM_NAME:
        # A fallback behind the stub would only ever back up a grader that
        # does not grade. Refusing is clearer than silently ignoring it.
        raise ProviderMisconfiguredError(
            f"{FALLBACK_PREFIX}_PROVIDER is set but ILIA_LLM_PROVIDER is empty: "
            "configure the primary provider first"
        )

    return _build(
        name=name,
        api_key=settings.llm_fallback_api_key,
        model=settings.llm_fallback_model,
        base_url=settings.llm_fallback_base_url,
        prefix=FALLBACK_PREFIX,
    )


def _build(*, name: str, api_key: str, model: str, base_url: str, prefix: str) -> LlmClient:
    try:
        provider = Provider(name)
    except ValueError as exc:
        supported = ", ".join(sorted(p.value for p in Provider))
        raise ProviderMisconfiguredError(
            f"Unknown {prefix}_PROVIDER {name!r}. Supported: {supported}"
        ) from exc

    api_key = api_key.strip()
    if not api_key:
        raise ProviderMisconfiguredError(
            f"{prefix}_PROVIDER is {provider.value!r} but {prefix}_API_KEY is empty"
        )

    model = model.strip() or DEFAULT_MODELS.get(provider, "")
    if not model:
        raise ProviderMisconfiguredError(
            f"{prefix}_MODEL is required for provider {provider.value!r}"
        )

    base_url = base_url.strip()

    # The provider and model are logged; the key never is, not even truncated.
    # A prefix is enough to identify which key leaked and which account to bill.
    logger.info(
        "llm_provider_configured",
        role="fallback" if prefix == FALLBACK_PREFIX else "primary",
        provider=provider.value,
        model=model,
    )

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
            f"{prefix}_BASE_URL is required for provider 'openai-compatible'"
        )

    return OpenAiCompatibleClient(
        api_key=api_key, model=model, base_url=base_url, provider="openai-compatible"
    )
