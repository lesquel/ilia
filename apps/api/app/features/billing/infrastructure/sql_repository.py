"""PostgreSQL implementations of the billing ports."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select

from app.core.database import Database
from app.features.billing.domain.entities import Plan, PlanCatalog, Subscription
from app.features.catalog.domain.entities import Level
from app.features.evaluation.infrastructure.models import LlmUsageModel, SubmissionModel

from .models import PlanModel, SubscriptionModel


def _to_plan(row: PlanModel) -> Plan:
    # An unrecognized level in the JSON is dropped rather than fatal: a plan
    # written by a newer version must not break an older worker.
    levels = frozenset(Level(value) for value in (row.allowed_levels or []) if value in set(Level))

    return Plan(
        id=row.id,
        code=row.code,
        name=row.name,
        description=row.description,
        monthly_evaluations=row.monthly_evaluations,
        allowed_levels=levels,
        can_issue_certificates=row.can_issue_certificates,
        can_post_in_forum=row.can_post_in_forum,
        price_cents=row.price_cents,
        is_default=row.is_default,
    )


class SqlAlchemyPlanRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def catalog(self) -> PlanCatalog:
        async with self._db.session() as session:
            rows = (
                (await session.execute(select(PlanModel).order_by(PlanModel.price_cents)))
                .scalars()
                .all()
            )

        return PlanCatalog(plans=[_to_plan(row) for row in rows])

    async def by_code(self, code: str) -> Plan | None:
        async with self._db.session() as session:
            result = await session.execute(select(PlanModel).where(PlanModel.code == code))
            row = result.scalar_one_or_none()

        return _to_plan(row) if row else None


class SqlAlchemySubscriptionRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def for_user(self, user_id: UUID) -> Subscription | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(SubscriptionModel)
                .where(SubscriptionModel.user_id == user_id, SubscriptionModel.ended_at.is_(None))
                .order_by(SubscriptionModel.started_at.desc())
                .limit(1)
            )
            row = result.scalar_one_or_none()

        if row is None:
            return None

        return Subscription(
            id=row.id,
            user_id=row.user_id,
            plan_code=row.plan_code,
            started_at=row.started_at,
            expires_at=row.expires_at,
            ended_at=row.ended_at,
        )

    async def upsert(self, subscription: Subscription) -> None:
        async with self._db.session() as session:
            # Lock the account so concurrent plan changes cannot create two
            # current subscriptions and each transition keeps its own history.
            from app.features.auth.infrastructure.models import UserModel

            await session.execute(
                select(UserModel.id).where(UserModel.id == subscription.user_id).with_for_update()
            )
            current = await session.execute(
                select(SubscriptionModel)
                .where(SubscriptionModel.user_id == subscription.user_id, SubscriptionModel.ended_at.is_(None))
                .with_for_update()
            )
            prior = current.scalar_one_or_none()
            started_at = subscription.started_at or datetime.now(UTC)
            if prior is not None:
                if started_at <= prior.started_at:
                    started_at = datetime.now(UTC)
                    if started_at <= prior.started_at:
                        from datetime import timedelta

                        started_at = prior.started_at + timedelta(microseconds=1)
                prior.ended_at = started_at
            session.add(
                SubscriptionModel(
                    id=subscription.id,
                    user_id=subscription.user_id,
                    plan_code=subscription.plan_code,
                    started_at=started_at,
                    expires_at=subscription.expires_at,
                    ended_at=None,
                )
            )


class SqlEvaluationCounter:
    """Counts evaluations already spent **and** already committed.

    The usage ledger is what the bill is reconciled against, so it is the base.
    But a row only appears once the evaluation finishes, and an evaluation takes
    seconds against a real provider — so counting the ledger alone lets two
    submissions sent at the same moment both pass a quota of one, and the
    platform pays for both. Measured, not theorised: quota 1, two submissions
    fired together, two rows billed.

    An in-flight submission is a commitment: it will produce exactly one usage
    row. Counting it now is what makes the limit a limit.
    """

    def __init__(self, database: Database) -> None:
        self._db = database

    async def count_since(self, *, user_id: UUID, since: datetime) -> int:
        async with self._db.session() as session:
            spent = await session.execute(
                select(func.count(LlmUsageModel.id)).where(
                    LlmUsageModel.user_id == user_id,
                    LlmUsageModel.occurred_at >= since,
                )
            )

            # Submissions still being evaluated, which have not written their
            # usage row yet. `failed` is excluded: those never produced usage,
            # and charging for our own outage is what the attempt count already
            # refuses to do.
            committed = await session.execute(
                select(func.count(SubmissionModel.id)).where(
                    SubmissionModel.user_id == user_id,
                    SubmissionModel.created_at >= since,
                    SubmissionModel.status.in_(["pending", "running"]),
                )
            )

            return int(spent.scalar_one()) + int(committed.scalar_one())
