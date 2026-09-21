"""Admin domain: platform overview, role changes and LLM cost.

Pure Python. The cost arithmetic in particular lives here so it can be tested
without a provider, a database or a bill.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4


@dataclass(frozen=True)
class PlatformOverview:
    """The global picture (PRD A-01)."""

    students: int
    instructors: int
    admins: int
    courses_published: int
    courses_draft: int
    courses_archived: int
    enrollments: int
    submissions: int
    certificates_issued: int
    certificates_revoked: int

    @property
    def total_users(self) -> int:
        return self.students + self.instructors + self.admins

    @property
    def total_courses(self) -> int:
        return self.courses_published + self.courses_draft + self.courses_archived


@dataclass(frozen=True)
class UsageTotals:
    """Token consumption, and what it costs (PRD A-03, TRD 6.4).

    Prices are configuration, not a constant: the provider is not chosen yet
    (TRD 2.6), and hard-coding a number nobody agreed to would produce a cost
    report that looks authoritative and is invented.
    """

    input_tokens: int
    output_tokens: int
    evaluations: int
    input_price_per_million: float = 0.0
    output_price_per_million: float = 0.0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    @property
    def estimated_cost(self) -> float:
        return round(
            self.input_tokens * self.input_price_per_million / 1_000_000
            + self.output_tokens * self.output_price_per_million / 1_000_000,
            4,
        )

    @property
    def prices_configured(self) -> bool:
        """Whether the cost figure means anything.

        With no prices set, `estimated_cost` is zero — and a zero that means
        "not configured" must never be shown as a zero that means "free".
        """
        return self.input_price_per_million > 0 or self.output_price_per_million > 0


@dataclass(frozen=True)
class UsageByUser:
    user_id: UUID
    full_name: str
    email: str
    totals: UsageTotals


class AuditAction(StrEnum):
    ROLE_CHANGED = "role_changed"
    CERTIFICATE_REVOKED = "certificate_revoked"
    COURSE_PUBLISHED = "course_published"
    COURSE_UNPUBLISHED = "course_unpublished"
    PASSWORD_RESET_ISSUED = "password_reset_issued"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"


@dataclass
class AuditEntry:
    """One sensitive action, recorded (TRD 7, 11).

    Append-only by construction: there is no method to change one. An audit log
    that can be edited is not an audit log.
    """

    id: UUID
    actor_id: UUID
    actor_name: str
    action: AuditAction
    target_type: str
    target_id: UUID | None
    detail: dict[str, object] = field(default_factory=dict)
    occurred_at: datetime | None = None

    @classmethod
    def record(
        cls,
        *,
        actor_id: UUID,
        actor_name: str,
        action: AuditAction,
        target_type: str,
        target_id: UUID | None = None,
        detail: dict[str, object] | None = None,
        at: datetime | None = None,
    ) -> "AuditEntry":
        return cls(
            id=uuid4(),
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail or {},
            occurred_at=at,
        )
