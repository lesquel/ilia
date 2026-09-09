"""ChatGPT, DeepSeek, and anything else speaking the Chat Completions protocol.

One adapter, several providers. DeepSeek publishes an OpenAI-compatible API,
and so do most self-hosted gateways, so the only thing that changes between
them is the base URL and the key. Writing this three times would be three
places to fix the same bug.
"""

from typing import Any

import httpx

from app.features.evaluation.infrastructure.llm.base import LlmResponse
from app.features.evaluation.infrastructure.llm.transport import post_json

OPENAI_BASE_URL = "https://api.openai.com/v1"
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"


class OpenAiCompatibleClient:
    def __init__(
        self, *, api_key: str, model: str, base_url: str, provider: str = "openai"
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._provider = provider

    @property
    def model(self) -> str:
        return self._model

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_output_tokens: int,
        json_schema: dict[str, Any] | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> LlmResponse:
        payload: dict[str, Any] = {
            "model": self._model,
            "max_tokens": max_output_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }

        if json_schema is not None:
            # `json_object` rather than `json_schema`: the strict schema mode is
            # not available on every model or on every compatible provider, and
            # an adapter that only works on the newest OpenAI models is not an
            # adapter. The caller validates the shape either way.
            payload["response_format"] = {"type": "json_object"}

        body = await post_json(
            url=f"{self._base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            payload=payload,
            provider=self._provider,
            transport=transport,
        )

        choices = body.get("choices") or []
        text = ""
        if choices:
            text = (choices[0].get("message") or {}).get("content") or ""

        usage = body.get("usage") or {}

        return LlmResponse(
            text=text,
            model=self._model,
            model_version=str(body.get("model") or self._model),
            input_tokens=int(usage.get("prompt_tokens") or 0),
            output_tokens=int(usage.get("completion_tokens") or 0),
        )
