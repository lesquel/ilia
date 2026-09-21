"""A provider-free executor and judge, for local development.

**These do not evaluate anything.** They produce well-formed, deterministic
output so the pipeline can be run, demonstrated and tested end to end while
`ILIA_LLM_PROVIDER` is empty. The real adapters implement the same two ports
and drop in beside these. Nothing in `domain` or `application` changes when a
provider is configured; that is what the ports are for (TRD T4).

The shipped engine is `RunEvaluation` in ordinary Python. Do not treat these
scores as real, and do not certify anyone with them.
"""

import hashlib

from app.features.evaluation.domain.entities import ModelOutput
from app.features.evaluation.domain.ports import JudgeVerdict, UntrustedPrompt
from app.features.evaluation.domain.rubric import Rubric

MODEL_NAME = "local-stub"
MODEL_VERSION = "0"


def _stable_score(seed: str) -> float:
    """A repeatable pseudo-score in the 40-95 range.

    Derived from a hash so the same prompt always gets the same mark: a
    placeholder that returned random numbers would make every downstream test
    flaky for no reason.
    """
    digest = hashlib.sha256(seed.encode()).digest()
    return 40.0 + (digest[0] / 255) * 55.0


class LocalPromptExecutor:
    """Echoes a plausible answer without calling anything.

    Still honours `max_output_tokens` in its accounting, so the cost-recording
    path is exercised for real.
    """

    async def execute(self, prompt: UntrustedPrompt, *, max_output_tokens: int) -> ModelOutput:
        text = (
            "[Salida simulada — todavía no hay proveedor de LLM configurado]\n\n"
            f"Respuesta a: {prompt.text[:200]}"
        )

        return ModelOutput(
            text=text,
            model=MODEL_NAME,
            model_version=MODEL_VERSION,
            # Rough 4-characters-per-token estimate. Good enough to make the
            # usage table non-empty; a real adapter reports the provider's count.
            input_tokens=max(1, len(prompt.text) // 4),
            output_tokens=min(max_output_tokens, max(1, len(text) // 4)),
        )


class LocalPromptJudge:
    """Produces schema-valid scores without judging anything.

    Note what it still does correctly, because these are the parts the real
    adapter must also honour:

    - It scores **only** the keys the rubric defines.
    - It returns no total — the backend computes that (TRD 6.2.3).
    - It receives the student's text as an `UntrustedPrompt` and never merges it
      into instructions.
    """

    async def judge(
        self,
        *,
        statement: str,
        prompt: UntrustedPrompt,
        output: str,
        rubric: Rubric,
    ) -> JudgeVerdict:
        scores = {
            dimension.key: (
                _stable_score(f"{dimension.key}:{prompt.text}"),
                (
                    "Puntuación simulada: todavía no hay un evaluador real "
                    f"conectado para «{dimension.name}»."
                ),
            )
            for dimension in rubric.dimensions
        }

        return JudgeVerdict(
            scores=scores,
            feedback=(
                "Esta evaluación es simulada. El motor de EVALs está construido y "
                "probado, pero todavía no hay un proveedor de LLM configurado, así "
                "que las puntuaciones de las dimensiones juzgadas no significan nada."
            ),
            suggestion="",
            model=MODEL_NAME,
            model_version=MODEL_VERSION,
            input_tokens=max(1, (len(statement) + len(prompt.text) + len(output)) // 4),
            output_tokens=40,
        )
