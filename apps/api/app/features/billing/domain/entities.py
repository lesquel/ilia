"""Plans, subscriptions and what each one lets a teacher do (PRD §11).

**Every number here is data, not code.** The free-tier quota and the paid price
are still open (PRD open question 4), so they live in `plan` rows an admin can
change — not in constants a developer would have to redeploy to move. Hardcoding
a limit nobody agreed to is how a placeholder becomes a policy by accident.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from app.features.catalog.domain.entities import Level

FREE_PLAN_CODE = "free"


class PlanCode(StrEnum):
    FREE = "free"
    PRO = "pro"


@dataclass(frozen=True)
class Plan:
    id: UUID
    code: str
    name: str
    description: str
    # None means unlimited. Zero means "none at all", which is a different
    # thing, and conflating them is how a paid plan silently stops working.
    monthly_evaluations: int | None
    allowed_levels: frozenset[Level]
    can_issue_certificates: bool
    can_post_in_forum: bool
    # In cents, or None while pricing is undecided. Showing a price nobody
    # agreed to is worse than showing none.
    price_cents: int | None = None
    is_default: bool = False

    def allows(self, level: Level) -> bool:
        return level in self.allowed_levels


@dataclass
class Subscription:
    id: UUID
    user_id: UUID
    plan_code: str
    started_at: datetime | None = None
    # None means it does not expire — which is what the free plan is.
    expires_at: datetime | None = None
    ended_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        user_id: UUID,
        plan_code: str,
        started_at: datetime | None = None,
        expires_at: datetime | None = None,
        ended_at: datetime | None = None,
    ) -> "Subscription":
        return cls(
            id=uuid4(),
            user_id=user_id,
            plan_code=plan_code,
            started_at=started_at,
            expires_at=expires_at,
            ended_at=ended_at,
        )

    def is_active(self, at: datetime) -> bool:
        started = self.started_at is None or self.started_at <= at
        return (
            started and self.ended_at is None and (self.expires_at is None or self.expires_at > at)
        )


@dataclass(frozen=True)
class Entitlements:
    """What a teacher can do right now.

    Derived from their plan and their usage this period. Computed, never
    stored: a cached entitlement outlives the subscription that granted it.
    """

    plan: Plan
    evaluations_used: int

    @property
    def evaluations_remaining(self) -> int | None:
        if self.plan.monthly_evaluations is None:
            return None
        return max(0, self.plan.monthly_evaluations - self.evaluations_used)

    @property
    def has_evaluations_left(self) -> bool:
        remaining = self.evaluations_remaining
        return remaining is None or remaining > 0

    def can_enrol_in(self, level: Level) -> bool:
        return self.plan.allows(level)

    @property
    def can_issue_certificates(self) -> bool:
        return self.plan.can_issue_certificates

    @property
    def can_post_in_forum(self) -> bool:
        return self.plan.can_post_in_forum


def period_start(at: datetime) -> datetime:
    """The first instant of the current calendar month.

    A calendar month, not a rolling 30 days: "tu cupo se renueva el 1" is
    something a teacher can hold in their head, and "30 days after whenever you
    first used it" is not.
    """
    moment = at.astimezone(UTC)
    return moment.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@dataclass(frozen=True)
class PlanCatalog:
    """The plans on offer, with the default one identified."""

    plans: list[Plan] = field(default_factory=list)

    @property
    def default(self) -> Plan | None:
        return next((plan for plan in self.plans if plan.is_default), None)

    def by_code(self, code: str) -> Plan | None:
        return next((plan for plan in self.plans if plan.code == code), None)
