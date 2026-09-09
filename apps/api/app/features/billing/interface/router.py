"""Plan and entitlement endpoints (PRD §11)."""

from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.features.auth.interface.dependencies import CurrentUser
from app.features.billing.application.use_cases import ListPlans
from app.features.billing.domain.entities import Entitlements, Plan
from app.features.billing.interface.dependencies import (
    PlansDep,
    get_entitlements_use_case,
)

router = APIRouter(prefix="/billing", tags=["billing"])


class PlanResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: str
    monthly_evaluations: int | None
    allowed_levels: list[str]
    can_issue_certificates: bool
    can_post_in_forum: bool
    price_cents: int | None
    is_default: bool

    @classmethod
    def from_entity(cls, plan: Plan) -> "PlanResponse":
        return cls(
            id=plan.id,
            code=plan.code,
            name=plan.name,
            description=plan.description,
            monthly_evaluations=plan.monthly_evaluations,
            allowed_levels=sorted(level.value for level in plan.allowed_levels),
            can_issue_certificates=plan.can_issue_certificates,
            can_post_in_forum=plan.can_post_in_forum,
            # Null while pricing is undecided (PRD open question 4). The client
            # shows "a definir" rather than inventing a number.
            price_cents=plan.price_cents,
            is_default=plan.is_default,
        )


class EntitlementsResponse(BaseModel):
    plan: PlanResponse
    evaluations_used: int
    # Null means unlimited, which is not the same as zero.
    evaluations_remaining: int | None
    can_issue_certificates: bool
    can_post_in_forum: bool
    allowed_levels: list[str]

    @classmethod
    def from_entity(cls, entitlements: Entitlements) -> "EntitlementsResponse":
        return cls(
            plan=PlanResponse.from_entity(entitlements.plan),
            evaluations_used=entitlements.evaluations_used,
            evaluations_remaining=entitlements.evaluations_remaining,
            can_issue_certificates=entitlements.can_issue_certificates,
            can_post_in_forum=entitlements.can_post_in_forum,
            allowed_levels=sorted(level.value for level in entitlements.plan.allowed_levels),
        )


@router.get("/plans", response_model=list[PlanResponse])
async def plans(plan_repository: PlansDep) -> list[PlanResponse]:
    """Public: someone deciding whether to sign up needs to see what they get."""
    catalog = await ListPlans(plans=plan_repository).execute()
    return [PlanResponse.from_entity(plan) for plan in catalog.plans]


@router.get("/me", response_model=EntitlementsResponse)
async def my_entitlements(request: Request, user: CurrentUser) -> EntitlementsResponse:
    """My plan and what is left of my quota this month."""
    use_case = get_entitlements_use_case(request)

    if use_case is None:
        from app.shared.errors import UnavailableError

        raise UnavailableError("Plans require a configured database")

    return EntitlementsResponse.from_entity(await use_case.execute(user=user))
