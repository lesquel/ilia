"""Running the teacher's prompt, against any provider.

Step 2 of TRD 6.1. The point of this call is isolation: it carries the
teacher's text and nothing of ours, so whatever the model answers, it is
answering only the prompt being graded.
"""

from app.features.evaluation.domain.entities import ModelOutput
from app.features.evaluation.domain.ports import UntrustedPrompt
from app.features.evaluation.infrastructure.llm.base import LlmClient

# Deliberately minimal. Anything we add here — "be helpful", "answer in
# Spanish", "format as a list" — is us doing part of the teacher's job for
# them, and then grading them for it.
SYSTEM = "You are a general-purpose assistant. Answer the user's request directly."


class LlmPromptExecutor:
    def __init__(self, client: LlmClient) -> None:
        self._client = client

    async def execute(self, prompt: UntrustedPrompt, *, max_output_tokens: int) -> ModelOutput:
        # `.text`, never the object: `UntrustedPrompt.__str__` raises precisely
        # so that an accidental f-string cannot slip user text somewhere it
        # should not go.
        response = await self._client.complete(
            system=SYSTEM,
            user=prompt.text,
            max_output_tokens=max_output_tokens,
        )

        return ModelOutput(
            text=response.text,
            model=response.model,
            model_version=response.model_version,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
        )
