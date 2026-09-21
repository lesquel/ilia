"""Certificate domain: codes, criteria and revocation."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.features.certificates.domain.entities import (
    SIMULATED_EVALUATION_MODEL,
    Certificate,
    CertificateStatus,
    VerificationCode,
    check_criteria,
)
from app.features.evaluation.infrastructure.llm import STUB_LLM_NAME


def make_certificate() -> Certificate:
    return Certificate.issue(
        user_id=uuid4(),
        course_id=uuid4(),
        holder_name="  Ana Pérez  ",
        course_title="Prompting para docentes",
        issued_at=datetime(2026, 9, 8, tzinfo=UTC),
    )


class TestVerificationCode:
    def test_generated_codes_are_the_right_shape(self) -> None:
        code = VerificationCode.generate()

        assert len(code.value) == 12
        assert code.value.isupper()

    def test_generated_codes_are_not_predictable(self) -> None:
        # A sequential code would let anyone enumerate every certificate the
        # platform ever issued.
        codes = {VerificationCode.generate().value for _ in range(200)}

        assert len(codes) == 200

    def test_the_alphabet_avoids_characters_that_get_misread(self) -> None:
        # A code gets read aloud and typed by someone who did not receive it.
        for _ in range(200):
            value = VerificationCode.generate().value
            assert not set(value) & set("O0I1L")

    def test_it_is_formatted_in_groups_for_reading(self) -> None:
        assert VerificationCode("ABCD2345EFGH").formatted == "ABCD-2345-EFGH"

    def test_a_formatted_code_is_accepted_back(self) -> None:
        # Whoever types it will type the hyphens they were shown.
        assert VerificationCode("ABCD-2345-EFGH").value == "ABCD2345EFGH"

    def test_lowercase_and_spaces_are_accepted(self) -> None:
        assert VerificationCode("  abcd2345efgh ").value == "ABCD2345EFGH"

    @pytest.mark.parametrize(
        "value", ["", "SHORT", "ABCD2345EFGHI", "ABCD2345EFG0", "!!!!!!!!!!!!"]
    )
    def test_malformed_codes_are_rejected(self, value: str) -> None:
        with pytest.raises(ValueError):
            VerificationCode(value)


class TestIssuing:
    def test_a_new_certificate_is_valid(self) -> None:
        assert make_certificate().is_valid

    def test_the_holder_name_is_trimmed(self) -> None:
        assert make_certificate().holder_name == "Ana Pérez"

    def test_each_certificate_gets_its_own_code(self) -> None:
        assert make_certificate().code.value != make_certificate().code.value


class TestRevocation:
    def test_revoking_marks_it_and_records_who_and_why(self) -> None:
        certificate = make_certificate()
        admin = uuid4()

        certificate.revoke(by=admin, reason="Emitido por error", at=datetime.now(UTC))

        assert certificate.status is CertificateStatus.REVOKED
        assert not certificate.is_valid
        assert certificate.revoked_by == admin
        assert certificate.revoked_reason == "Emitido por error"

    def test_revoking_without_a_reason_is_refused(self) -> None:
        # Taking away a teacher's certificate without saying why is not
        # something the platform should make easy.
        with pytest.raises(ValueError):
            make_certificate().revoke(by=uuid4(), reason="   ")

    def test_the_record_survives_revocation(self) -> None:
        # A certificate that vanished would be indistinguishable from one that
        # never existed, and both the holder and whoever is checking deserve
        # better than that.
        certificate = make_certificate()
        code = certificate.code.value

        certificate.revoke(by=uuid4(), reason="Fraude comprobado")

        assert certificate.code.value == code
        assert certificate.holder_name == "Ana Pérez"


class TestCriteria:
    def test_everything_done_qualifies(self) -> None:
        outcome = check_criteria(
            lessons_total=4, lessons_completed=4, activities_total=1, activities_passed=1
        )

        assert outcome.met
        assert outcome.missing == []

    def test_pending_lessons_are_named_with_a_count(self) -> None:
        outcome = check_criteria(
            lessons_total=4, lessons_completed=2, activities_total=0, activities_passed=0
        )

        assert not outcome.met
        assert "2 lecciones" in outcome.missing[0]

    def test_the_singular_is_used_for_one(self) -> None:
        outcome = check_criteria(
            lessons_total=4, lessons_completed=3, activities_total=0, activities_passed=0
        )

        assert "1 lección" in outcome.missing[0]

    def test_a_failed_activity_blocks_the_certificate(self) -> None:
        # And passing an activity already requires meeting its objective
        # requirements, so a certificate cannot be reached on an inflated judge
        # score alone.
        outcome = check_criteria(
            lessons_total=4, lessons_completed=4, activities_total=2, activities_passed=1
        )

        assert not outcome.met
        assert "1 actividad" in outcome.missing[0]

    def test_a_course_with_no_activities_only_needs_its_lessons(self) -> None:
        outcome = check_criteria(
            lessons_total=3, lessons_completed=3, activities_total=0, activities_passed=0
        )

        assert outcome.met

    def test_an_empty_course_never_qualifies(self) -> None:
        # A syllabus still being written must not hand out certification.
        outcome = check_criteria(
            lessons_total=0, lessons_completed=0, activities_total=0, activities_passed=0
        )

        assert not outcome.met
        assert "todavía no tiene lecciones" in outcome.missing[0]

    def test_every_missing_reason_is_reported_not_just_the_first(self) -> None:
        outcome = check_criteria(
            lessons_total=4, lessons_completed=1, activities_total=2, activities_passed=0
        )

        assert len(outcome.missing) == 2

    def test_a_stub_pass_does_not_qualify_even_when_the_counts_look_complete(self) -> None:
        # Parked from Task 2: a local-stub score can satisfy "every activity
        # passed" and mint a certificate. Simulated notes are not a credential.
        outcome = check_criteria(
            lessons_total=4,
            lessons_completed=4,
            activities_total=1,
            activities_passed=1,
            simulated_passed=1,
        )

        assert not outcome.met
        assert any("simuladas" in reason for reason in outcome.missing)

    def test_a_real_pass_still_qualifies(self) -> None:
        outcome = check_criteria(
            lessons_total=4,
            lessons_completed=4,
            activities_total=1,
            activities_passed=1,
            simulated_passed=0,
        )

        assert outcome.met
        assert outcome.missing == []

    def test_the_stub_model_name_matches_what_the_evaluator_writes(self) -> None:
        # If these drift, the SQL filter would keep counting local-stub passes.
        assert SIMULATED_EVALUATION_MODEL == STUB_LLM_NAME == "local-stub"
