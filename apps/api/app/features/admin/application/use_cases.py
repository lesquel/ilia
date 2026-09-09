"""Admin use cases (PRD A-01 … A-04)."""

from datetime import datetime
from uuid import UUID

from app.features.admin.domain.entities import (
    AuditAction,
    AuditEntry,
    PlatformOverview,
    UsageByUser,
    UsageTotals,
)
from app.features.admin.domain.errors import (
    CannotDemoteYourselfError,
    LastAdminError,
    UserNotFoundError,
)
from app.features.admin.domain.ports import (
    AuditLog,
    MetricsReader,
    UsagePricing,
    UserDirectory,
    build_by_user,
    build_totals,
)
from app.features.auth.domain.entities import Role, User
from app.features.auth.domain.ports import Clock, UserRepository


class GetOverview:
    def __init__(self, *, metrics: MetricsReader) -> None:
        self._metrics = metrics

    async def execute(self) -> PlatformOverview:
        return await self._metrics.overview()


class GetUsageReport:
    """Token consumption and its cost (PRD A-03, TRD 6.4)."""

    def __init__(self, *, metrics: MetricsReader, pricing: UsagePricing) -> None:
        self._metrics = metrics
        self._pricing = pricing

    async def execute(
        self, *, since: datetime | None = None
    ) -> tuple[UsageTotals, list[UsageByUser]]:
        totals = build_totals(await self._metrics.usage_totals(since=since), self._pricing)
        by_user = build_by_user(await self._metrics.usage_by_user(since=since), self._pricing)

        return totals, by_user


class ListUsers:
    def __init__(self, *, directory: UserDirectory) -> None:
        self._directory = directory

    async def execute(self, *, query: str | None = None) -> list[User]:
        cleaned = query.strip() if query else None
        return await self._directory.list_users(query=cleaned or None)


class ChangeUserRole:
    """Grant or remove a role (PRD A-02). Immediate, and audited.

    There is no self-service path to instructor or admin anywhere in the
    platform: the role is granted, never claimed.
    """

    def __init__(
        self,
        *,
        directory: UserDirectory,
        users: UserRepository,
        audit: AuditLog,
        clock: Clock,
    ) -> None:
        self._directory = directory
        self._users = users
        self._audit = audit
        self._clock = clock

    async def execute(self, *, admin: User, user_id: UUID, role: Role) -> User:
        # An admin cannot change their own role. The alternative is a platform
        # with nobody able to grant it back, recoverable only by editing the
        # database by hand.
        if user_id == admin.id:
            raise CannotDemoteYourselfError()

        target = await self._users.get_by_id(user_id)
        if target is None:
            raise UserNotFoundError()

        previous = target.role

        # Removing the last admin locks everyone out of this very screen.
        if (
            previous is Role.ADMIN
            and role is not Role.ADMIN
            and await self._directory.count_admins() <= 1
        ):
            raise LastAdminError()

        await self._directory.set_role(user_id=user_id, role=role)

        await self._audit.append(
            AuditEntry.record(
                actor_id=admin.id,
                actor_name=admin.full_name,
                action=AuditAction.ROLE_CHANGED,
                target_type="user",
                target_id=user_id,
                detail={
                    "email": str(target.email),
                    "from": previous.value,
                    "to": role.value,
                },
                at=self._clock.now(),
            )
        )

        updated = await self._users.get_by_id(user_id)
        if updated is None:  # pragma: no cover - defensive
            raise UserNotFoundError()

        return updated


class ListAuditLog:
    def __init__(self, *, audit: AuditLog) -> None:
        self._audit = audit

    async def execute(self, *, limit: int = 100) -> list[AuditEntry]:
        return await self._audit.recent(limit=limit)
