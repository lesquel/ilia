from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings
from app.core.database import Database
from app.features.certificates.domain.ports import (
    ActivityResultsReader,
    CertificateRepository,
)
from app.features.certificates.infrastructure.memory_repository import (
    InMemoryCertificateRepository,
    StubActivityResults,
)
from app.features.certificates.infrastructure.sql_repository import (
    SqlActivityResultsReader,
    SqlAlchemyCertificateRepository,
)


def build_certificate_container(
    settings: Settings, database: Database | None = None
) -> dict[str, object]:
    if database is not None:
        return {
            "certificates": SqlAlchemyCertificateRepository(database),
            "results": SqlActivityResultsReader(database),
        }

    structlog.get_logger().warning(
        "certificates_using_in_memory_repositories",
        detail="ILIA_DATABASE_URL is not set; certificates will be lost on restart",
    )
    return {
        "certificates": InMemoryCertificateRepository(),
        "results": StubActivityResults(),
    }


def get_certificates(request: Request) -> CertificateRepository:
    return request.app.state.certificates["certificates"]  # type: ignore[no-any-return]


def get_results(request: Request) -> ActivityResultsReader:
    return request.app.state.certificates["results"]  # type: ignore[no-any-return]


CertificatesDep = Annotated[CertificateRepository, Depends(get_certificates)]
ResultsDep = Annotated[ActivityResultsReader, Depends(get_results)]
