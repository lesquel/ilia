from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.admin.domain.ports import (
    AuditLog,
    MetricsReader,
    UsagePricing,
    UserDirectory,
)
from app.features.admin.infrastructure.memory_repository import InMemoryAuditLog
from app.features.admin.infrastructure.sql_repository import (
    SettingsPricing,
    SqlAlchemyAuditLog,
    SqlAlchemyMetricsReader,
    SqlAlchemyUserDirectory,
)


def build_admin_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is None:
        structlog.get_logger().warning(
            "admin_unavailable_without_database",
            detail="ILIA_DATABASE_URL is not set; admin endpoints will not work",
        )
        # The audit log is the one part that works without a database: an
        # action claimed to be audited must be audited on every configuration.
        return {"audit": InMemoryAuditLog(), "pricing": SettingsPricing(settings)}

    return {
        "metrics": SqlAlchemyMetricsReader(database),
        "directory": SqlAlchemyUserDirectory(database),
        "audit": SqlAlchemyAuditLog(database),
        "pricing": SettingsPricing(settings),
    }


def _require(request: Request, key: str) -> object:
    container = request.app.state.admin
    if key not in container:
        from app.shared.errors import UnavailableError

        raise UnavailableError("Administration requires a configured database")
    return container[key]


def get_metrics(request: Request) -> MetricsReader:
    return _require(request, "metrics")  # type: ignore[return-value]


def get_directory(request: Request) -> UserDirectory:
    return _require(request, "directory")  # type: ignore[return-value]


def get_audit(request: Request) -> AuditLog:
    return _require(request, "audit")  # type: ignore[return-value]


def get_pricing(request: Request) -> UsagePricing:
    return _require(request, "pricing")  # type: ignore[return-value]


MetricsDep = Annotated[MetricsReader, Depends(get_metrics)]
DirectoryDep = Annotated[UserDirectory, Depends(get_directory)]
AuditDep = Annotated[AuditLog, Depends(get_audit)]
PricingDep = Annotated[UsagePricing, Depends(get_pricing)]
