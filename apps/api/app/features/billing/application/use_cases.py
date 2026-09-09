"""Billing use cases and the entitlement gates other features consume."""

from uuid import UUID

from app.features.auth.domain.entities import Role, User
from app.features.auth.domain.ports import Clock
from app.features.billing.domain.entities import (
    Entitlements,
    Plan,
    PlanCatalog,
    period_start,
)
from app.features.billing.domain.errors import (
    PlanDoesNotAllowCertificatesError,
    PlanDoesNotAllowLevelError,
    PlanDoesNotAllowPostingError,
)
from app.features.billing.domain.ports import (
    EvaluationCounter,
    PlanRepository,
    SubscriptionRepository,
)
from app.features.catalog.domain.entities import Level


class UnlimitedPlan:
    """The plan an instructor or admin effectively has.

    Staff are not customers of the platform they run. Billing an instructor for
    evaluating their own activity would be absurd, and it would also make every
    course impossible to test before publishing.
    """

    @staticmethod
    def build() -> Plan:
        from uuid import UUID as _UUID

        return Plan(
            id=_UUID("00000000-0000-0000-0000-000000000000"),
            code="staff",
            name="Equipo",
            description="Sin límites: instructores y administradores no son clientes.",
            monthly_evaluations=None,
            allowed_levels=frozenset(Level),
            can_issue_certificates=True,
            can_post_in_forum=True,
        )


class GetEntitlements:
    """What this teacher can do right now.

    Every gate in the product goes through here, so the answer is computed in
    one place rather than re-derived — slightly differently — at four call sites.
    """

    def __init__(
        self,
        *,
        plans: PlanRepository,
        subscriptions: SubscriptionRepository,
        counter: EvaluationCounter,
        clock: Clock,
    ) -> None:
        self._plans = plans
        self._subscriptions = subscriptions
        self._counter = counter
        self._clock = clock

    async def execute(self, *, user: User) -> Entitlements:
        now = self._clock.now()

        if user.has_at_least(Role.INSTRUCTOR):
            return Entitlements(plan=UnlimitedPlan.build(), evaluations_used=0)

        plan = await self._resolve_plan(user.id, now)
        used = await self._counter.count_since(user_id=user.id, since=period_start(now))

        return Entitlements(plan=plan, evaluations_used=used)

    async def _resolve_plan(self, user_id: UUID, now) -> Plan:  # type: ignore[no-untyped-def]
        catalog = await self._plans.catalog()
        default = catalog.default

        subscription = await self._subscriptions.for_user(user_id)

        # An expired subscription falls back to the default plan rather than
        # locking the teacher out. Losing access to work you already did because
        # a payment lapsed is how a platform loses someone permanently.
        if subscription is not None and subscription.is_active(now):
            plan = catalog.by_code(subscription.plan_code)
            if plan is not None:
                return plan

        if default is None:
            # No plans configured at all: fall back to unlimited rather than
            # blocking everyone. A misconfiguration should degrade into a
            # generous platform, not a broken one.
            return UnlimitedPlan.build()

        return default


class ListPlans:
    def __init__(self, *, plans: PlanRepository) -> None:
        self._plans = plans

    async def execute(self) -> PlanCatalog:
        return await self._plans.catalog()


class PlanQuotaPolicy:
    """The real `QuotaPolicy` the evaluation feature runs on (PRD §11).

    Consumption is not tracked here: it is counted from the usage ledger, which
    the evaluation feature already writes for every run. Two places recording
    the same fact is two places to disagree.
    """

    def __init__(self, *, entitlements: GetEntitlements, users) -> None:  # type: ignore[no-untyped-def]
        self._entitlements = entitlements
        self._users = users

    async def remaining(self, user_id: UUID) -> int | None:
        user = await self._users.get_by_id(user_id)
        if user is None:
            return 0

        return (await self._entitlements.execute(user=user)).evaluations_remaining

    async def consume(self, user_id: UUID) -> None:
        # Nothing to do: the evaluation records its own token usage, and that
        # ledger is what the quota counts.
        return None


def require_level(entitlements: Entitlements, level: Level) -> None:
    if not entitlements.can_enrol_in(level):
        raise PlanDoesNotAllowLevelError(level.value)


def require_certificates(entitlements: Entitlements) -> None:
    if not entitlements.can_issue_certificates:
        raise PlanDoesNotAllowCertificatesError()


def require_posting(entitlements: Entitlements) -> None:
    if not entitlements.can_post_in_forum:
        raise PlanDoesNotAllowPostingError()
