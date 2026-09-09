"""The HTTP behaviour every provider adapter shares.

Timeouts and retries are written here rather than four times over, because
getting them wrong is a production incident and getting them wrong in only one
of four adapters is a production incident nobody can reproduce.
"""

import asyncio
from typing import Any

import httpx
import structlog

from app.features.evaluation.infrastructure.llm.base import LlmError

logger = structlog.get_logger()

# Judging a prompt is a few seconds of work. Beyond this something is wrong,
# and a teacher watching a spinner deserves an answer rather than a hang.
DEFAULT_TIMEOUT_SECONDS = 60.0

# Only transient conditions are retried. A 400 means we built a bad request and
# will build the same bad request again; retrying it just spends money slower.
RETRY_STATUSES = frozenset({408, 409, 429, 500, 502, 503, 504})
MAX_ATTEMPTS = 3


async def post_json(
    *,
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
    provider: str,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    """POST JSON and return the decoded body, retrying only what is worth retrying.

    `transport` is a seam for tests: it lets the suite assert the exact bytes
    each provider would receive without a network. A misspelled field name is
    otherwise only discovered against the real API, by a teacher.
    """
    last_error: str = "unknown"

    async with httpx.AsyncClient(timeout=timeout, transport=transport) as client:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                last_error = "timeout"
                logger.warning("llm_timeout", provider=provider, attempt=attempt)
                if attempt == MAX_ATTEMPTS:
                    raise LlmError(f"{provider} timed out") from exc
            except httpx.HTTPError as exc:
                last_error = "transport"
                logger.warning("llm_transport_error", provider=provider, attempt=attempt)
                if attempt == MAX_ATTEMPTS:
                    raise LlmError(f"{provider} could not be reached") from exc
            else:
                if response.status_code < 400:
                    try:
                        body: dict[str, Any] = response.json()
                    except ValueError as exc:
                        raise LlmError(f"{provider} returned a non-JSON body") from exc
                    return body

                last_error = f"http_{response.status_code}"
                # The body can carry the provider's own error text. It is not
                # logged: it may quote the prompt back, and prompts can name a
                # teacher's pupils (TRD 11).
                logger.warning(
                    "llm_http_error",
                    provider=provider,
                    status=response.status_code,
                    attempt=attempt,
                )

                if response.status_code not in RETRY_STATUSES or attempt == MAX_ATTEMPTS:
                    raise LlmError(f"{provider} answered {response.status_code}")

            # Exponential back-off. A provider rate-limiting us is asking for
            # room, and hammering it is how a queue turns into an outage.
            await asyncio.sleep(0.5 * 2 ** (attempt - 1))

    raise LlmError(f"{provider} failed after {MAX_ATTEMPTS} attempts ({last_error})")
