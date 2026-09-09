"""Gemini, over Google's generateContent endpoint."""

from typing import Any

import httpx

from app.features.evaluation.infrastructure.llm.base import LlmResponse
from app.features.evaluation.infrastructure.llm.transport import post_json

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class GeminiClient:
    """Google's Generative Language API.

    Two things differ from the others and both matter: the system prompt is
    `systemInstruction` (a separate field, which is what we want), and the API
    key goes in a header rather than the query string — a key in a URL ends up
    in proxy logs and browser history.
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
        generation: dict[str, Any] = {"maxOutputTokens": max_output_tokens}
        if json_schema is not None:
            generation["responseMimeType"] = "application/json"

        payload: dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": generation,
        }

        body = await post_json(
            url=f"{BASE_URL}/models/{self._model}:generateContent",
            headers={
                "x-goog-api-key": self._api_key,
                "Content-Type": "application/json",
            },
            payload=payload,
            provider="gemini",
            transport=transport,
        )

        candidates = body.get("candidates") or []
        text = ""
        if candidates:
            parts = (candidates[0].get("content") or {}).get("parts") or []
            text = "".join(part.get("text", "") for part in parts)

        usage = body.get("usageMetadata") or {}

        return LlmResponse(
            text=text,
            model=self._model,
            model_version=str(body.get("modelVersion") or self._model),
            input_tokens=int(usage.get("promptTokenCount") or 0),
            output_tokens=int(usage.get("candidatesTokenCount") or 0),
        )
