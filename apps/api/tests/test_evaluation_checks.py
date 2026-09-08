"""Deterministic checks.

Cheap, reproducible, and the part of a grade that does not move between runs.
"""

import pytest

from app.features.evaluation.domain.checks import CheckSpec, run_checks


class TestNoSpec:
    def test_an_activity_with_no_requirements_has_no_checks(self) -> None:
        outcome = run_checks("cualquier cosa", CheckSpec())

        assert not outcome.applicable

    def test_and_scores_full_marks_rather_than_zero(self) -> None:
        # Having nothing to verify is not the same as failing verification.
        assert run_checks("cualquier cosa", CheckSpec()).score == 100.0


class TestLength:
    def test_a_prompt_below_the_minimum_fails(self) -> None:
        outcome = run_checks("hacé un ejercicio", CheckSpec(min_length=10))

        assert not outcome.results[0].passed

    def test_a_long_enough_prompt_passes(self) -> None:
        prompt = " ".join(["palabra"] * 12)

        assert run_checks(prompt, CheckSpec(min_length=10)).results[0].passed

    def test_padding_with_whitespace_does_not_pass_a_length_check(self) -> None:
        # Otherwise a prompt of newlines clears the bar without saying anything.
        prompt = "corto\n\n\n\n\n\n\n\n\n\n\n\n"

        assert not run_checks(prompt, CheckSpec(min_length=10)).results[0].passed

    def test_a_prompt_over_the_maximum_fails(self) -> None:
        prompt = " ".join(["palabra"] * 30)

        assert not run_checks(prompt, CheckSpec(max_length=10)).results[0].passed


class TestFormat:
    @pytest.mark.parametrize(
        "prompt",
        [
            "Devolvelo en una tabla",
            "Respondé en formato JSON",
            "Dame una lista de cinco puntos",
            "Máximo 200 palabras",
        ],
    )
    def test_recognizes_a_stated_format(self, prompt: str) -> None:
        assert run_checks(prompt, CheckSpec(requires_format=True)).results[0].passed

    def test_a_prompt_that_says_nothing_about_format_fails(self) -> None:
        outcome = run_checks("Explicame las fracciones", CheckSpec(requires_format=True))

        assert not outcome.results[0].passed
        assert "formato" in outcome.failures[0].message


class TestRole:
    @pytest.mark.parametrize(
        "prompt",
        [
            "Actuá como docente de matemática",
            "Sos profesor de séptimo grado",
            "Dirigido a alumnos de 14 años",
            "Para estudiantes que nunca vieron el tema",
        ],
    )
    def test_recognizes_a_role_or_an_audience(self, prompt: str) -> None:
        assert run_checks(prompt, CheckSpec(requires_role=True)).results[0].passed

    def test_a_prompt_with_neither_fails(self) -> None:
        assert not run_checks("Hacé un resumen", CheckSpec(requires_role=True)).results[0].passed


class TestRequiredTerms:
    def test_any_synonym_counts(self) -> None:
        spec = CheckSpec(required_terms=[["fracciones", "quebrados"]])

        assert run_checks("ejercicios de quebrados", spec).results[0].passed

    def test_a_missing_term_fails_and_says_which(self) -> None:
        spec = CheckSpec(required_terms=[["fracciones", "quebrados"]])

        outcome = run_checks("ejercicios de geometría", spec)

        assert not outcome.results[0].passed
        assert "fracciones" in outcome.failures[0].message

    def test_matching_ignores_accents_and_case(self) -> None:
        # A teacher writing "publico" instead of "público" is not making the
        # mistake this check exists to catch.
        spec = CheckSpec(required_terms=[["público"]])

        assert run_checks("pensado para el PUBLICO general", spec).results[0].passed


class TestScoring:
    def test_the_score_is_the_share_of_checks_passed(self) -> None:
        spec = CheckSpec(requires_format=True, requires_role=True)

        outcome = run_checks("Actuá como docente y explicá fracciones", spec)

        assert outcome.passed_count == 1
        assert outcome.score == 50.0

    def test_everything_passing_scores_full_marks(self) -> None:
        spec = CheckSpec(requires_format=True, requires_role=True)

        outcome = run_checks("Actuá como docente. Devolvelo en una tabla.", spec)

        assert outcome.score == 100.0
        assert outcome.failures == []

    def test_running_the_same_prompt_twice_gives_the_same_result(self) -> None:
        # The whole point: this part of the grade does not move.
        spec = CheckSpec(requires_format=True, requires_role=True, min_length=3)
        prompt = "Actuá como docente y devolvelo en una tabla"

        assert run_checks(prompt, spec).score == run_checks(prompt, spec).score
