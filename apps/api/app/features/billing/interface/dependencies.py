from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.auth.interface.dependencies import CurrentUser
from app.features.billing.application.use_cases import GetEntitlements
from app.features.billing.domain.entities import Entitlements
from app.features.billing.domain.ports import PlanRepository
from app.features.billing.infrastructure.sql_repository import (
    SqlAlchemyPlanRepository,
    SqlAlchemySubscriptionRepository,
    SqlEvaluationCounter,
)


def build_billing_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is None:
        structlog.get_logger().warning(
            "billing_unavailable_without_database",
            detail="ILIA_DATABASE_URL is not set; everyone is treated as unlimited",
        )
        return {}

    return {
        "plans": SqlAlchemyPlanRepository(database),
        "subscriptions": SqlAlchemySubscriptionRepository(database),
        "counter": SqlEvaluationCounter(database),
    }


def get_entitlements_use_case(request: Request) -> GetEntitlements | None:
    """None when billing is not configured.

    A missing container means "no plans, no limits" rather than an error: a
    platform without billing configured should work, generously, not break.
    """
    container = request.app.state.billing
    if "plans" not in container:
        return None

    return GetEntitlements(
        plans=container["plans"],
        subscriptions=container["subscriptions"],
        counter=container["counter"],
        clock=request.app.state.auth["clock"],
    )


async def current_entitlements(request: Request, user: CurrentUser) -> Entitlements | None:
    """Entitlements for whoever is authenticated, or None if billing is off.

    The user comes from the same `CurrentUser` dependency the route uses, so
    FastAPI resolves it once per request instead of reading it twice.
    """
    use_case = get_entitlements_use_case(request)
    if use_case is None:
        return None

    return await use_case.execute(user=user)


def get_plans(request: Request) -> PlanRepository:
    container = request.app.state.billing
    if "plans" not in container:
        from app.shared.errors import UnavailableError

        raise UnavailableError("Plans require a configured database")
    return container["plans"]  # type: ignore[no-any-return]


PlansDep = Annotated[PlanRepository, Depends(get_plans)]
EntitlementsDep = Annotated[Entitlements | None, Depends(current_entitlements)]
