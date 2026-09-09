"""What every LLM provider looks like from the inside of ILIA.

The four providers we support differ only in the shape of one HTTPS request.
Everything that matters — how the student's prompt is isolated, how the judge is
instructed, which scores are accepted, how a total is computed — is identical
regardless of who answers. So that logic is written once, over this protocol,
and each provider contributes an adapter of roughly eighty lines.

**Why raw HTTP instead of four official SDKs.** Each SDK brings its own
dependency tree, release cadence and breaking changes, and we use perhaps five
per cent of any of them: one non-streaming call, JSON out, token counts back.
Four SDKs would be four times the supply-chain surface to audit for a container
that grades teachers' work. The request shapes below are small enough to read
in full, which is the point.
"""

from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.shared.errors import DomainError


class LlmError(DomainError):
    """The provider could not be reached, or answered with something unusable."""

    code = "llm_unavailable"


class LlmResponseInvalidError(LlmError):
    """The provider answered, but not with what it was asked for."""

    code = "llm_response_invalid"


@dataclass(frozen=True)
class LlmResponse:
    """One completion, plus what it cost.

    Token counts come from the provider rather than being estimated here. The
    cost report an admin reads is only worth reading if the numbers are the
    ones we were actually billed for.
    """

    text: str
    model: str
    model_version: str
    input_tokens: int
    output_tokens: int


class LlmClient(Protocol):
    """One completion call.

    `system` carries our instructions and **only** ours. `user` carries the
    material being worked on. Keeping them in separate arguments is not
    cosmetic: it is what stops a teacher's prompt from arriving as if it were
    an instruction from us (TRD 6.2.1).
    """

    @property
    def model(self) -> str: ...

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_output_tokens: int,
        json_schema: dict[str, Any] | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> LlmResponse:
        """Answer `user` under `system`.

        When `json_schema` is given, the adapter must ask the provider for JSON
        matching it, and the caller still validates the result — a provider
        that promises structured output is not the same as a provider that
        delivered it.
        """
        ...
