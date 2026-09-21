"""Adapter: auth's ResetAuditLog port backed by the admin audit log."""

from app.features.admin.domain.entities import AuditAction, AuditEntry
from app.features.admin.domain.ports import AuditLog
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import Clock, ResetAuditLog


class AdminResetAuditLog(ResetAuditLog):
    def __init__(self, *, audit: AuditLog, clock: Clock) -> None:
        self._audit = audit
        self._clock = clock

    async def record_issued(self, *, actor: User, target: User) -> None:
        await self._audit.append(
            AuditEntry.record(
                actor_id=actor.id,
                actor_name=actor.full_name,
                action=AuditAction.PASSWORD_RESET_ISSUED,
                target_type="user",
                target_id=target.id,
                detail={"email": str(target.email)},
                at=self._clock.now(),
            )
        )

    async def record_completed(self, *, user: User) -> None:
        await self._audit.append(
            AuditEntry.record(
                actor_id=user.id,
                actor_name=user.full_name,
                action=AuditAction.PASSWORD_RESET_COMPLETED,
                target_type="user",
                target_id=user.id,
                detail={"email": str(user.email)},
                at=self._clock.now(),
            )
        )
