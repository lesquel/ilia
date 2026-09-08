"""Score aggregation.

**This module is the reason a grade can be defended.** The judge model proposes
a number per dimension; nothing else it says is trusted. The total is computed
here, from the rubric's own weights, in ordinary Python — so the same
submission and the same dimension scores always produce the same final mark,
whatever the model felt like returning (TRD 6.2.3).
"""

from dataclasses import dataclass

from app.features.evaluation.domain.rubric import Dimension, Rubric

# Every dimension is scored on the same 0-100 scale. One scale, so a teacher
# comparing two dimensions is comparing like with like.
MIN_SCORE = 0.0
MAX_SCORE = 100.0


@dataclass(frozen=True)
class DimensionScore:
    key: str
    score: float
    justification: str

    def __post_init__(self) -> None:
        if not self.justification.strip():
            # PRD E-06: the result must break each dimension down with a reason,
            # not just a number. A score with no reason is not reviewable.
            raise ValueError("A dimension score needs a justification")


@dataclass(frozen=True)
class ScoreBreakdown:
    dimension_scores: list[DimensionScore]
    total: float
    # False when the submission failed a deterministic check — an objective
    # requirement of the activity that the platform measured for itself.
    meets_requirements: bool = True

    @property
    def passed(self) -> bool:
        """Whether this attempt counts toward certification.

        Two conditions, not one. The weighted total says *how good* the prompt
        was; `meets_requirements` says *whether it did what the activity asked*.
        Only the first depends on a model's judgement.

        This separation is what keeps a compromised judge from certifying
        anyone: a fully injected judgement can inflate the number, but it cannot
        make a prompt contain a format instruction it does not contain. Grading
        on the weighted total alone let a maximally-compromised judge reach 77
        against a 70 threshold — comfortably certified on a prompt that met none
        of the activity's stated requirements.
        """
        return self.total >= PASS_THRESHOLD and self.meets_requirements


# Threshold for a submission to count toward certification.
# **[A confirmar]** — the PRD leaves the number open (§10); this is a starting
# point, not a decision.
PASS_THRESHOLD = 70.0


def clamp(score: float) -> float:
    """Force a score into range.

    A judge model will occasionally return 120, or -5, or a number for a
    dimension it invented. Clamping here means a malformed judgement degrades
    the grade instead of corrupting it.
    """
    return max(MIN_SCORE, min(MAX_SCORE, score))


def aggregate(
    rubric: Rubric,
    raw_scores: dict[str, tuple[float, str]],
    *,
    meets_requirements: bool = True,
) -> ScoreBreakdown:
    """Combine per-dimension scores into a final mark.

    `raw_scores` maps a dimension key to (score, justification) — whatever the
    judge proposed. What comes out is computed, never accepted:

    - Keys the rubric does not define are **dropped**. A model inventing a
      dimension must not be able to add weight to the grade.
    - Dimensions the judge skipped score zero rather than being ignored, so an
      unanswered dimension cannot quietly raise the average.
    - Weights are normalized, so the total is a real 0-100 regardless of what
      the weights happen to add up to.
    """
    scores: list[DimensionScore] = []
    total = 0.0

    for dimension in rubric.dimensions:
        raw = raw_scores.get(dimension.key)

        if raw is None:
            score, justification = 0.0, "El evaluador no puntuó esta dimensión."
        else:
            score, justification = clamp(raw[0]), raw[1].strip() or "Sin justificación."

        scores.append(DimensionScore(key=dimension.key, score=score, justification=justification))
        total += score * rubric.normalized_weight(dimension)

    return ScoreBreakdown(
        dimension_scores=scores,
        total=round(clamp(total), 2),
        meets_requirements=meets_requirements,
    )


def weakest_dimension(rubric: Rubric, breakdown: ScoreBreakdown) -> Dimension | None:
    """The dimension worth working on next.

    Feedback that says "improve everything" is feedback a teacher cannot act on.
    """
    if not breakdown.dimension_scores:
        return None

    lowest = min(breakdown.dimension_scores, key=lambda item: item.score)
    return rubric.by_key(lowest.key)
