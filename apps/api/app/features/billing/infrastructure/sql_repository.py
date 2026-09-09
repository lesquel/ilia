"""PostgreSQL implementations of the billing ports."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import Database
from app.features.billing.domain.entities import Plan, PlanCatalog, Subscription
from app.features.catalog.domain.entities import Level
from app.features.evaluation.infrastructure.models import LlmUsageModel

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
                select(SubscriptionModel).where(SubscriptionModel.user_id == user_id)
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
        )

    async def upsert(self, subscription: Subscription) -> None:
        # One row per teacher, replaced rather than appended: two live
        # subscriptions would make "which plan am I on?" ambiguous.
        statement = (
            pg_insert(SubscriptionModel)
            .values(
                id=subscription.id,
                user_id=subscription.user_id,
                plan_code=subscription.plan_code,
                started_at=subscription.started_at,
                expires_at=subscription.expires_at,
            )
            .on_conflict_do_update(
                index_elements=[SubscriptionModel.user_id],
                set_={
                    "plan_code": subscription.plan_code,
                    "started_at": subscription.started_at,
                    "expires_at": subscription.expires_at,
                },
            )
        )

        async with self._db.session() as session:
            await session.execute(statement)


class SqlEvaluationCounter:
    """Counts evaluations from the usage ledger.

    The ledger is what the bill is reconciled against, so counting from it means
    the quota and the invoice can never disagree.
    """

    def __init__(self, database: Database) -> None:
        self._db = database

    async def count_since(self, *, user_id: UUID, since: datetime) -> int:
        async with self._db.session() as session:
            result = await session.execute(
                select(func.count(LlmUsageModel.id)).where(
                    LlmUsageModel.user_id == user_id,
                    LlmUsageModel.occurred_at >= since,
                )
            )
            return int(result.scalar_one())
