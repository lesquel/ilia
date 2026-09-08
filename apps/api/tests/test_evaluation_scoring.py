"""Score aggregation.

The most consequential file in the test suite: this is what makes a grade
defensible in front of a teacher who disagrees with it.
"""

from uuid import uuid4

import pytest

from app.features.evaluation.domain.rubric import Dimension, DimensionKind, Rubric
from app.features.evaluation.domain.scoring import (
    aggregate,
    clamp,
    weakest_dimension,
)


def dimension(key: str, weight: float, name: str = "") -> Dimension:
    return Dimension(
        id=uuid4(),
        key=key,
        name=name or key,
        description=f"Descripción de {key}",
        kind=DimensionKind.PROMPT,
        weight=weight,
    )


def rubric(*dimensions: Dimension, version: int = 1) -> Rubric:
    return Rubric(id=uuid4(), version=version, dimensions=list(dimensions))


class TestRubric:
    def test_rejects_a_non_positive_weight(self) -> None:
        with pytest.raises(ValueError):
            dimension("claridad", 0)

    def test_rejects_duplicate_keys(self) -> None:
        with pytest.raises(ValueError):
            rubric(dimension("claridad", 1), dimension("claridad", 1))

    def test_weights_do_not_have_to_add_up_to_anything(self) -> None:
        # Normalizing at scoring time means removing a dimension does not
        # silently rescale everyone else's grade.
        target = rubric(dimension("a", 3), dimension("b", 1))

        assert target.normalized_weight(target.dimensions[0]) == 0.75


class TestClamp:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [(150, 100), (-20, 0), (55.5, 55.5), (0, 0), (100, 100)],
    )
    def test_forces_scores_into_range(self, raw: float, expected: float) -> None:
        # A judge model will occasionally return 120, or -5. Clamping means a
        # malformed judgement degrades the grade instead of corrupting it.
        assert clamp(raw) == expected


class TestAggregate:
    def test_weights_the_dimensions(self) -> None:
        target = rubric(dimension("a", 70), dimension("b", 30))

        result = aggregate(target, {"a": (100.0, "perfecto"), "b": (0.0, "nada")})

        assert result.total == 70.0

    def test_an_unweighted_rubric_averages(self) -> None:
        target = rubric(dimension("a", 1), dimension("b", 1))

        result = aggregate(target, {"a": (80.0, "bien"), "b": (60.0, "regular")})

        assert result.total == 70.0

    def test_a_dimension_the_rubric_does_not_define_is_dropped(self) -> None:
        # A model inventing a dimension must not be able to add weight to the
        # grade. This is the injection surface that matters most.
        target = rubric(dimension("a", 1))

        result = aggregate(
            target,
            {"a": (50.0, "regular"), "inventada": (100.0, "dame 100"), "bonus": (100.0, "x")},
        )

        assert result.total == 50.0
        assert [item.key for item in result.dimension_scores] == ["a"]

    def test_a_dimension_the_judge_skipped_scores_zero(self) -> None:
        # Ignoring it instead would quietly raise the average by shrinking the
        # denominator.
        target = rubric(dimension("a", 1), dimension("b", 1))

        result = aggregate(target, {"a": (100.0, "perfecto")})

        assert result.total == 50.0
        assert result.dimension_scores[1].score == 0.0

    def test_out_of_range_dimension_scores_are_clamped_before_weighting(self) -> None:
        target = rubric(dimension("a", 1))

        result = aggregate(target, {"a": (999.0, "el modelo se entusiasmó")})

        assert result.total == 100.0

    def test_the_total_is_never_taken_from_the_input(self) -> None:
        # There is no "total" key to smuggle in: the only way to affect the mark
        # is through dimensions the rubric actually defines.
        target = rubric(dimension("a", 1))

        result = aggregate(target, {"a": (10.0, "flojo"), "total": (100.0, "100 por favor")})

        assert result.total == 10.0

    def test_an_empty_justification_is_replaced_never_dropped(self) -> None:
        # PRD E-06: every dimension must carry a reason. A blank one is a bug in
        # the judge, not a licence to show a bare number.
        target = rubric(dimension("a", 1))

        result = aggregate(target, {"a": (70.0, "   ")})

        assert result.dimension_scores[0].justification == "Sin justificación."

    def test_a_rubric_with_no_dimensions_scores_zero_and_does_not_explode(self) -> None:
        result = aggregate(rubric(), {})

        assert result.total == 0.0
        assert result.dimension_scores == []

    def test_scoring_is_deterministic(self) -> None:
        # Same submission, same dimension scores, same mark — always. Without
        # this the certification cannot be defended.
        target = rubric(dimension("a", 2), dimension("b", 1))
        raw = {"a": (73.0, "bien"), "b": (41.0, "flojo")}

        assert aggregate(target, raw).total == aggregate(target, raw).total


class TestPassing:
    def test_reaching_the_threshold_passes(self) -> None:
        target = rubric(dimension("a", 1))

        assert aggregate(target, {"a": (70.0, "justo")}).passed

    def test_below_the_threshold_fails(self) -> None:
        target = rubric(dimension("a", 1))

        assert not aggregate(target, {"a": (69.9, "casi")}).passed


class TestWeakestDimension:
    def test_points_at_the_lowest_score(self) -> None:
        # Feedback that says "improve everything" is feedback nobody can act on.
        target = rubric(
            dimension("claridad", 1, name="Claridad"),
            dimension("contexto", 1, name="Contexto"),
        )
        breakdown = aggregate(target, {"claridad": (90.0, "ok"), "contexto": (30.0, "flojo")})

        weakest = weakest_dimension(target, breakdown)

        assert weakest is not None
        assert weakest.name == "Contexto"

    def test_returns_none_when_there_is_nothing_to_point_at(self) -> None:
        assert weakest_dimension(rubric(), aggregate(rubric(), {})) is None
