from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.features.admin.domain.entities import (
    AuditEntry,
    PlatformOverview,
    UsageByUser,
    UsageTotals,
)
from app.features.auth.domain.entities import Role, User


class MetricsReader(Protocol):
    async def overview(self) -> PlatformOverview: ...

    async def usage_totals(self, *, since: datetime | None = None) -> tuple[int, int, int]:
        """(input_tokens, output_tokens, evaluations) for the period."""
        ...

    async def usage_by_user(
        self, *, since: datetime | None = None, limit: int = 50
    ) -> list[tuple[UUID, str, str, int, int, int]]:
        """Per-user consumption, heaviest first.

        Ordered by spend rather than by name: the point of this list is finding
        who is costing the most, not looking someone up.
        """
        ...


class UserDirectory(Protocol):
    async def list_users(self, *, query: str | None = None, limit: int = 100) -> list[User]: ...

    async def count_admins(self) -> int: ...

    async def set_role(self, *, user_id: UUID, role: Role) -> None: ...


class AuditLog(Protocol):
    async def append(self, entry: AuditEntry) -> None: ...

    async def recent(self, limit: int = 100) -> list[AuditEntry]: ...


class UsagePricing(Protocol):
    def prices(self) -> tuple[float, float]:
        """(input, output) price per million tokens."""
        ...


def build_totals(raw: tuple[int, int, int], pricing: UsagePricing) -> UsageTotals:
    input_price, output_price = pricing.prices()
    return UsageTotals(
        input_tokens=raw[0],
        output_tokens=raw[1],
        evaluations=raw[2],
        input_price_per_million=input_price,
        output_price_per_million=output_price,
    )


def build_by_user(
    rows: list[tuple[UUID, str, str, int, int, int]], pricing: UsagePricing
) -> list[UsageByUser]:
    input_price, output_price = pricing.prices()

    return [
        UsageByUser(
            user_id=user_id,
            full_name=full_name,
            email=email,
            totals=UsageTotals(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                evaluations=evaluations,
                input_price_per_million=input_price,
                output_price_per_million=output_price,
            ),
        )
        for user_id, full_name, email, input_tokens, output_tokens, evaluations in rows
    ]
