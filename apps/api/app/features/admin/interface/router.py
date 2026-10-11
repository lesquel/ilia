"""Admin endpoints (PRD A-01 … A-03). Every route requires the admin role."""

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field

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
from app.features.enrollment.application.use_cases import CreateCohort, ListCohorts
from app.features.enrollment.domain.entities import Cohort
from app.features.enrollment.interface.dependencies import CohortsDep
from app.shared.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

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


class PageMeta(BaseModel):
    """Every paginated listing answers with its total.

    Without it a page of fifty is indistinguishable from a complete list of
    fifty, and an admin looking for someone concludes they are not there.
    """

    total: int
    limit: int
    offset: int


class UserPageResponse(PageMeta):
    items: list[UserResponse]


@router.get("/users", response_model=UserPageResponse)
async def users(
    admin: Admin,
    directory: DirectoryDep,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> UserPageResponse:
    page = await ListUsers(directory=directory).execute(query=q, limit=limit, offset=offset)
    return UserPageResponse(
        items=[UserResponse.from_entity(item) for item in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


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


class AuditPageResponse(PageMeta):
    items: list[AuditEntryResponse]


@router.get("/audit", response_model=AuditPageResponse)
async def audit_log(
    admin: Admin,
    audit: AuditDep,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AuditPageResponse:
    """The record of sensitive actions. Append-only: nothing here can be edited."""
    page = await ListAuditLog(audit=audit).execute(limit=limit, offset=offset)
    return AuditPageResponse(
        items=[AuditEntryResponse.from_entity(entry) for entry in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


class CreateCohortRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    # Handed out at the talk, e.g. MANTA-SEP-01. Unique across charlas.
    code: str = Field(min_length=1, max_length=32)
    starts_on: datetime | None = None


class CohortResponse(BaseModel):
    id: UUID
    name: str
    code: str
    starts_on: datetime | None = None
    created_at: datetime | None

    @classmethod
    def from_entity(cls, cohort: Cohort) -> "CohortResponse":
        return cls(
            id=cohort.id,
            name=cohort.name,
            code=cohort.code,
            starts_on=cohort.starts_on,
            created_at=cohort.created_at,
        )


class CohortListResponse(BaseModel):
    items: list[CohortResponse]


@router.post("/cohorts", response_model=CohortResponse, status_code=status.HTTP_201_CREATED)
async def create_cohort(
    payload: CreateCohortRequest,
    request: Request,
    admin: Admin,
    cohorts: CohortsDep,
) -> CohortResponse:
    """Open a charla. Teachers join later with this code on enroll."""
    created = await CreateCohort(cohorts=cohorts, clock=request.app.state.auth["clock"]).execute(
        name=payload.name, code=payload.code, starts_on=payload.starts_on
    )
    return CohortResponse.from_entity(created)


@router.get("/cohorts", response_model=CohortListResponse)
async def list_cohorts(admin: Admin, cohorts: CohortsDep) -> CohortListResponse:
    items = await ListCohorts(cohorts=cohorts).execute()
    return CohortListResponse(items=[CohortResponse.from_entity(item) for item in items])
