"""Billing domain: plans, quota arithmetic and period boundaries."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.features.billing.domain.entities import (
    Entitlements,
    Plan,
    PlanCatalog,
    Subscription,
    period_start,
)
from app.features.catalog.domain.entities import Level


def plan(
    *,
    code: str = "free",
    monthly: int | None = 10,
    levels: set[Level] | None = None,
    certificates: bool = False,
    forum: bool = False,
    default: bool = False,
) -> Plan:
    return Plan(
        id=uuid4(),
        code=code,
        name=code.capitalize(),
        description="",
        monthly_evaluations=monthly,
        allowed_levels=frozenset(levels or {Level.BEGINNER}),
        can_issue_certificates=certificates,
        can_post_in_forum=forum,
        is_default=default,
    )


class TestQuota:
    def test_remaining_counts_down_from_the_plan(self) -> None:
        entitlements = Entitlements(plan=plan(monthly=10), evaluations_used=3)

        assert entitlements.evaluations_remaining == 7
        assert entitlements.has_evaluations_left

    def test_it_never_goes_negative(self) -> None:
        # Overshooting can happen — two requests racing the same last slot —
        # and a negative quota rendered in the UI is nonsense.
        entitlements = Entitlements(plan=plan(monthly=10), evaluations_used=14)

        assert entitlements.evaluations_remaining == 0
        assert not entitlements.has_evaluations_left

    def test_none_means_unlimited_not_zero(self) -> None:
        # Conflating the two is how a paid plan silently stops working.
        entitlements = Entitlements(plan=plan(monthly=None), evaluations_used=9_999)

        assert entitlements.evaluations_remaining is None
        assert entitlements.has_evaluations_left

    def test_zero_means_none_at_all(self) -> None:
        entitlements = Entitlements(plan=plan(monthly=0), evaluations_used=0)

        assert entitlements.evaluations_remaining == 0
        assert not entitlements.has_evaluations_left


class TestLevelAccess:
    def test_the_free_plan_covers_the_basic_path_only(self) -> None:
        # PRD 11: ruta básica gratis, intermedia y experto de pago.
        entitlements = Entitlements(plan=plan(levels={Level.BEGINNER}), evaluations_used=0)

        assert entitlements.can_enrol_in(Level.BEGINNER)
        assert not entitlements.can_enrol_in(Level.INTERMEDIATE)
        assert not entitlements.can_enrol_in(Level.EXPERT)

    def test_the_paid_plan_covers_everything(self) -> None:
        entitlements = Entitlements(
            plan=plan(levels=set(Level), certificates=True, forum=True), evaluations_used=0
        )

        assert all(entitlements.can_enrol_in(level) for level in Level)
        assert entitlements.can_issue_certificates
        assert entitlements.can_post_in_forum


class TestPeriod:
    @pytest.mark.parametrize(
        ("moment", "expected_day"),
        [
            (datetime(2026, 9, 8, 23, 59, tzinfo=UTC), 1),
            (datetime(2026, 9, 1, 0, 0, tzinfo=UTC), 1),
            (datetime(2026, 12, 31, 12, 0, tzinfo=UTC), 1),
        ],
    )
    def test_the_period_is_the_calendar_month(self, moment: datetime, expected_day: int) -> None:
        # "Tu cupo se renueva el 1" is something a teacher can hold in their
        # head. "30 days after whenever you first used it" is not.
        start = period_start(moment)

        assert start.day == expected_day
        assert start.month == moment.month
        assert (start.hour, start.minute, start.second) == (0, 0, 0)


class TestSubscription:
    def test_one_without_an_expiry_is_always_active(self) -> None:
        subscription = Subscription.create(user_id=uuid4(), plan_code="free")

        assert subscription.is_active(datetime(2099, 1, 1, tzinfo=UTC))

    def test_an_expired_one_is_not_active(self) -> None:
        subscription = Subscription.create(
            user_id=uuid4(), plan_code="pro", expires_at=datetime(2026, 1, 1, tzinfo=UTC)
        )

        assert not subscription.is_active(datetime(2026, 6, 1, tzinfo=UTC))


class TestPlanCatalog:
    def test_it_finds_the_default(self) -> None:
        catalog = PlanCatalog(plans=[plan(code="pro"), plan(code="free", default=True)])

        assert catalog.default is not None
        assert catalog.default.code == "free"

    def test_a_catalog_with_no_default_says_so(self) -> None:
        assert PlanCatalog(plans=[plan(code="pro")]).default is None

    def test_it_looks_a_plan_up_by_code(self) -> None:
        catalog = PlanCatalog(plans=[plan(code="pro"), plan(code="free")])

        assert catalog.by_code("pro") is not None
        assert catalog.by_code("inventado") is None
