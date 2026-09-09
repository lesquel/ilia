"""Admin domain: cost arithmetic and the audit record."""

from uuid import uuid4

from app.features.admin.domain.entities import (
    AuditAction,
    AuditEntry,
    PlatformOverview,
    UsageTotals,
)


def overview(**overrides: int) -> PlatformOverview:
    base = {
        "students": 40,
        "instructors": 3,
        "admins": 1,
        "courses_published": 5,
        "courses_draft": 2,
        "courses_archived": 1,
        "enrollments": 120,
        "submissions": 300,
        "certificates_issued": 12,
        "certificates_revoked": 1,
    }
    base.update(overrides)
    return PlatformOverview(**base)  # type: ignore[arg-type]


class TestOverview:
    def test_totals_are_derived(self) -> None:
        assert overview().total_users == 44
        assert overview().total_courses == 8


class TestUsageCost:
    def test_cost_is_computed_from_the_configured_prices(self) -> None:
        totals = UsageTotals(
            input_tokens=1_000_000,
            output_tokens=500_000,
            evaluations=10,
            input_price_per_million=3.0,
            output_price_per_million=15.0,
        )

        assert totals.estimated_cost == 10.5

    def test_partial_millions_are_prorated(self) -> None:
        totals = UsageTotals(
            input_tokens=250_000,
            output_tokens=0,
            evaluations=1,
            input_price_per_million=4.0,
        )

        assert totals.estimated_cost == 1.0

    def test_without_prices_the_cost_is_zero(self) -> None:
        totals = UsageTotals(input_tokens=9_000_000, output_tokens=9_000_000, evaluations=99)

        assert totals.estimated_cost == 0.0

    def test_and_says_so_rather_than_pretending_it_is_free(self) -> None:
        # A zero that means "not configured" must never be read as a zero that
        # means "free". The provider is not chosen yet (TRD 2.6).
        no_prices = UsageTotals(input_tokens=1_000, output_tokens=1_000, evaluations=1)
        with_prices = UsageTotals(
            input_tokens=1_000,
            output_tokens=1_000,
            evaluations=1,
            input_price_per_million=3.0,
        )

        assert not no_prices.prices_configured
        assert with_prices.prices_configured

    def test_total_tokens_adds_both_directions(self) -> None:
        totals = UsageTotals(input_tokens=700, output_tokens=300, evaluations=2)

        assert totals.total_tokens == 1000


class TestAuditEntry:
    def test_it_records_who_did_what_to_whom(self) -> None:
        actor = uuid4()
        target = uuid4()

        entry = AuditEntry.record(
            actor_id=actor,
            actor_name="Ana Admin",
            action=AuditAction.ROLE_CHANGED,
            target_type="user",
            target_id=target,
            detail={"from": "student", "to": "instructor"},
        )

        assert entry.actor_id == actor
        assert entry.target_id == target
        assert entry.detail["to"] == "instructor"

    def test_the_actor_name_is_copied_not_referenced(self) -> None:
        # An audit entry must still say who did something after that account is
        # gone. An audit trail with holes is not an audit trail.
        entry = AuditEntry.record(
            actor_id=uuid4(),
            actor_name="Ana Admin",
            action=AuditAction.CERTIFICATE_REVOKED,
            target_type="certificate",
        )

        assert entry.actor_name == "Ana Admin"

    def test_there_is_no_way_to_edit_one(self) -> None:
        # Append-only by construction: no mutating method exists on the entity.
        assert not any(
            name for name in dir(AuditEntry) if name in {"update", "edit", "modify", "delete"}
        )
