"""Deterministic checks over the student's prompt.

Cheap, reproducible, and **not optional** (TRD 6.1). If the whole grade came
from a model's judgement, the same submission would score differently on two
runs and the certification would have nothing to stand on. These checks are the
part of the mark that does not move.

They are also the most actionable feedback in the product: "no dijiste en qué
formato querés la respuesta" is something a teacher can fix in ten seconds.
"""

import re
import unicodedata
from dataclasses import dataclass, field

# The reserved dimension key the deterministic checks score. A rubric that
# includes it gets an anchored, model-independent component in its total.
DETERMINISTIC_KEY = "deterministic"


def _fold(text: str) -> str:
    """Lowercase and strip accents.

    A teacher writing "publico" instead of "público" is not making a mistake
    this check should punish.
    """
    lowered = text.casefold()
    decomposed = unicodedata.normalize("NFD", lowered)
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


@dataclass(frozen=True)
class CheckSpec:
    """What an activity requires of the prompt itself.

    All of it is optional: an activity that declares nothing simply has no
    deterministic component, and its grade rests entirely on the judge.
    """

    # Terms the prompt must mention, e.g. the constraints the statement gave.
    # Each entry is a group of synonyms — matching any one of them counts.
    required_terms: list[list[str]] = field(default_factory=list)
    min_length: int = 0
    max_length: int = 0
    # Requires the prompt to say something about the shape of the answer.
    requires_format: bool = False
    # Requires the prompt to give the model a role or an audience.
    requires_role: bool = False


FORMAT_HINTS = (
    "formato",
    "tabla",
    "lista",
    "vinetas",
    "bullets",
    "json",
    "markdown",
    "parrafos",
    "columnas",
    "titulo",
    "esquema",
    "resumen de",
    "maximo de palabras",
    "palabras",
)

ROLE_HINTS = (
    "actua como",
    "actua de",
    "sos ",
    "eres ",
    "haz de",
    "como docente",
    "como profesor",
    "como experto",
    "tu rol",
    "para alumnos",
    "para estudiantes",
    "dirigido a",
    "audiencia",
)


@dataclass(frozen=True)
class CheckResult:
    key: str
    passed: bool
    message: str


@dataclass(frozen=True)
class CheckOutcome:
    results: list[CheckResult]

    @property
    def applicable(self) -> bool:
        return bool(self.results)

    @property
    def passed_count(self) -> int:
        return sum(1 for result in self.results if result.passed)

    @property
    def score(self) -> float:
        """Share of checks passed, on the same 0-100 scale as every dimension.

        An activity with no checks scores 100 rather than 0: having nothing to
        verify is not the same as failing verification.
        """
        if not self.results:
            return 100.0
        return round(self.passed_count * 100 / len(self.results), 2)

    @property
    def failures(self) -> list[CheckResult]:
        return [result for result in self.results if not result.passed]


def _mentions_any(folded_prompt: str, hints: tuple[str, ...] | list[str]) -> bool:
    return any(_fold(hint) in folded_prompt for hint in hints)


def run_checks(prompt: str, spec: CheckSpec) -> CheckOutcome:
    """Run every applicable check. Pure: same input, same output, always."""
    folded = _fold(prompt)
    # Collapse whitespace so a prompt padded with newlines cannot pass a length
    # requirement without saying anything.
    words = len(re.findall(r"\S+", prompt))

    results: list[CheckResult] = []

    if spec.min_length:
        results.append(
            CheckResult(
                key="min_length",
                passed=words >= spec.min_length,
                message=(
                    f"El prompt tiene {words} palabras; la actividad pide al menos "
                    f"{spec.min_length}."
                ),
            )
        )

    if spec.max_length:
        results.append(
            CheckResult(
                key="max_length",
                passed=words <= spec.max_length,
                message=(
                    f"El prompt tiene {words} palabras; la actividad permite como máximo "
                    f"{spec.max_length}."
                ),
            )
        )

    if spec.requires_format:
        results.append(
            CheckResult(
                key="format",
                passed=_mentions_any(folded, FORMAT_HINTS),
                message="El prompt no dice en qué formato querés la respuesta.",
            )
        )

    if spec.requires_role:
        results.append(
            CheckResult(
                key="role",
                passed=_mentions_any(folded, ROLE_HINTS),
                message="El prompt no le da al modelo un rol ni indica para quién es.",
            )
        )

    for index, synonyms in enumerate(spec.required_terms):
        results.append(
            CheckResult(
                key=f"term_{index}",
                passed=_mentions_any(folded, synonyms),
                message=f"El prompt no menciona: {synonyms[0]}.",
            )
        )

    return CheckOutcome(results=results)
