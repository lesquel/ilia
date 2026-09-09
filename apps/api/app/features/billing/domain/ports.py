from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.features.billing.domain.entities import Plan, PlanCatalog, Subscription


class PlanRepository(Protocol):
    async def catalog(self) -> PlanCatalog: ...

    async def by_code(self, code: str) -> Plan | None: ...


class SubscriptionRepository(Protocol):
    async def for_user(self, user_id: UUID) -> Subscription | None: ...

    async def upsert(self, subscription: Subscription) -> None: ...


class EvaluationCounter(Protocol):
    async def count_since(self, *, user_id: UUID, since: datetime) -> int:
        """Evaluations this teacher has spent in the period.

        Counted from the usage ledger rather than tracked in a counter column:
        a counter drifts the first time a write is lost, and the ledger is the
        thing the bill is reconciled against anyway.
        """
        ...
