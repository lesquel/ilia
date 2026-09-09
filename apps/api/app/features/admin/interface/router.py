"""Admin endpoints (PRD A-01 … A-03). Every route requires the admin role."""

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.features.admin.application.use_cases import (
    ChangeUserRole,
    GetOverview,
    GetUsageReport,
    ListAuditLog,
    ListUsers,
)
from app.features.admin.domain.entities import (
    AuditEntry,
    PlatformOverview,
    UsageByUser,
    UsageTotals,
)
from app.features.admin.interface.dependencies import (
    AuditDep,
    DirectoryDep,
    MetricsDep,
    PricingDep,
)
from app.features.auth.domain.entities import Role, User
from app.features.auth.interface.dependencies import require_role

router = APIRouter(prefix="/admin", tags=["admin"])

Admin = Annotated[User, Depends(require_role(Role.ADMIN))]


class OverviewResponse(BaseModel):
    students: int
    instructors: int
    admins: int
    total_users: int
    courses_published: int
    courses_draft: int
    courses_archived: int
    total_courses: int
    enrollments: int
    submissions: int
    certificates_issued: int
    certificates_revoked: int

    @classmethod
    def from_entity(cls, overview: PlatformOverview) -> "OverviewResponse":
        return cls(
            students=overview.students,
            instructors=overview.instructors,
            admins=overview.admins,
            total_users=overview.total_users,
            courses_published=overview.courses_published,
            courses_draft=overview.courses_draft,
            courses_archived=overview.courses_archived,
            total_courses=overview.total_courses,
            enrollments=overview.enrollments,
            submissions=overview.submissions,
            certificates_issued=overview.certificates_issued,
            certificates_revoked=overview.certificates_revoked,
        )


@router.get("/overview", response_model=OverviewResponse)
async def overview(admin: Admin, metrics: MetricsDep) -> OverviewResponse:
    return OverviewResponse.from_entity(await GetOverview(metrics=metrics).execute())


class UsageTotalsResponse(BaseModel):
    input_tokens: int
    output_tokens: int
    total_tokens: int
    evaluations: int
    estimated_cost: float
    # Whether the cost figure means anything. A zero that means "not
    # configured" must never be shown as a zero that means "free".
    prices_configured: bool

    @classmethod
    def from_entity(cls, totals: UsageTotals) -> "UsageTotalsResponse":
        return cls(
            input_tokens=totals.input_tokens,
            output_tokens=totals.output_tokens,
            total_tokens=totals.total_tokens,
            evaluations=totals.evaluations,
            estimated_cost=totals.estimated_cost,
            prices_configured=totals.prices_configured,
        )


class UsageByUserResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    totals: UsageTotalsResponse

    @classmethod
    def from_entity(cls, item: UsageByUser) -> "UsageByUserResponse":
        return cls(
            user_id=item.user_id,
            full_name=item.full_name,
            email=item.email,
            totals=UsageTotalsResponse.from_entity(item.totals),
        )


class UsageReportResponse(BaseModel):
    period_days: int | None
    totals: UsageTotalsResponse
    by_user: list[UsageByUserResponse]


@router.get("/usage", response_model=UsageReportResponse)
async def usage(
    admin: Admin,
    metrics: MetricsDep,
    pricing: PricingDep,
    days: Annotated[int | None, Query(ge=1, le=365)] = 30,
) -> UsageReportResponse:
    """Token consumption and cost (PRD A-03).

    Defaults to the last 30 days: "what is this costing me right now" is the
    question an admin actually has, and an all-time total answers a different one.
    """
    since = datetime.now(UTC) - timedelta(days=days) if days else None

    totals, by_user = await GetUsageReport(metrics=metrics, pricing=pricing).execute(since=since)

    return UsageReportResponse(
        period_days=days,
        totals=UsageTotalsResponse.from_entity(totals),
        by_user=[UsageByUserResponse.from_entity(item) for item in by_user],
    )


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool

    @classmethod
    def from_entity(cls, user: User) -> "UserResponse":
        return cls(
            id=user.id,
            email=str(user.email),
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
        )


@router.get("/users", response_model=list[UserResponse])
async def users(
    admin: Admin,
    directory: DirectoryDep,
    q: Annotated[str | None, Query(max_length=120)] = None,
) -> list[UserResponse]:
    found = await ListUsers(directory=directory).execute(query=q)
    return [UserResponse.from_entity(item) for item in found]


class RoleChangeRequest(BaseModel):
    role: Role


@router.post("/users/{user_id}/role", response_model=UserResponse)
async def change_role(
    user_id: UUID,
    payload: RoleChangeRequest,
    request: Request,
    admin: Admin,
    directory: DirectoryDep,
    audit: AuditDep,
) -> UserResponse:
    """Grant or remove a role (PRD A-02). Immediate, and audited.

    There is no self-service path to instructor or admin anywhere: the role is
    granted, never claimed.
    """
    updated = await ChangeUserRole(
        directory=directory,
        users=request.app.state.auth["users"],
        audit=audit,
        clock=request.app.state.auth["clock"],
    ).execute(admin=admin, user_id=user_id, role=payload.role)

    return UserResponse.from_entity(updated)


class AuditEntryResponse(BaseModel):
    id: UUID
    actor_name: str
    action: str
    target_type: str
    target_id: UUID | None
    detail: dict[str, object]
    occurred_at: datetime | None

    @classmethod
    def from_entity(cls, entry: AuditEntry) -> "AuditEntryResponse":
        return cls(
            id=entry.id,
            actor_name=entry.actor_name,
            action=entry.action.value,
            target_type=entry.target_type,
            target_id=entry.target_id,
            detail=entry.detail,
            occurred_at=entry.occurred_at,
        )


@router.get("/audit", response_model=list[AuditEntryResponse])
async def audit_log(admin: Admin, audit: AuditDep) -> list[AuditEntryResponse]:
    """The record of sensitive actions. Append-only: nothing here can be edited."""
    entries = await ListAuditLog(audit=audit).execute()
    return [AuditEntryResponse.from_entity(entry) for entry in entries]
