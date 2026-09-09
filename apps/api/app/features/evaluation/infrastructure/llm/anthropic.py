"""Claude, over the Anthropic Messages API."""

from typing import Any

import httpx

from app.features.evaluation.infrastructure.llm.base import LlmResponse
from app.features.evaluation.infrastructure.llm.transport import post_json

API_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"


class AnthropicClient:
    """Anthropic's Messages API.

    `system` is a top-level field here rather than a message, which happens to
    match exactly what we need: the teacher's prompt travels in the message
    list and cannot reach the instructions.
    """

    def __init__(self, *, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

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
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }

        if json_schema is not None:
            # Anthropic has no JSON-schema mode on this endpoint, so the schema
            # is stated in the instructions and the caller validates the result.
            # Prefilling the assistant turn with `{` is what reliably stops the
            # model from wrapping the object in prose.
            payload["messages"].append({"role": "assistant", "content": "{"})

        body = await post_json(
            url=API_URL,
            headers={
                "x-api-key": self._api_key,
                "anthropic-version": API_VERSION,
                "content-type": "application/json",
            },
            payload=payload,
            provider="anthropic",
            transport=transport,
        )

        blocks = body.get("content") or []
        text = "".join(block.get("text", "") for block in blocks if block.get("type") == "text")
        if json_schema is not None:
            # Put back the brace we prefilled, so the caller parses a whole object.
            text = "{" + text

        usage = body.get("usage") or {}

        return LlmResponse(
            text=text,
            model=self._model,
            # The exact model that answered, which can differ from the alias we
            # asked for. Recorded per submission so a grade stays explainable
            # after a provider silently moves an alias (TRD 6.3).
            model_version=str(body.get("model") or self._model),
            input_tokens=int(usage.get("input_tokens") or 0),
            output_tokens=int(usage.get("output_tokens") or 0),
        )
