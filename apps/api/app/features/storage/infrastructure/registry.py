"""Turning configuration into a storage provider."""

from enum import StrEnum

import structlog

from app.core.config import Settings
from app.features.storage.domain.ports import ObjectStorage
from app.features.storage.infrastructure.local import LocalStorage
from app.features.storage.infrastructure.s3 import S3CompatibleStorage

logger = structlog.get_logger()


class StorageProvider(StrEnum):
    S3 = "s3"
    LOCAL = "local"


class StorageMisconfiguredError(ValueError):
    """Named a provider that cannot be built from this configuration.

    Raised at startup rather than when a teacher presses play: a missing key
    discovered then costs them a lesson and tells them nothing.
    """


def build_storage(settings: Settings) -> ObjectStorage:
    name = settings.storage_provider.strip().lower()

    if not name or name == StorageProvider.LOCAL:
        if settings.is_production:
            raise StorageMisconfiguredError(
                "ILIA_STORAGE_PROVIDER must be set in production: the local "
                "adapter serves media through the API and signs nothing"
            )
        logger.warning(
            "storage_using_local_adapter",
            detail="ILIA_STORAGE_PROVIDER is not set; media is served unsigned by the API",
        )
        return LocalStorage(settings.storage_local_base_url)

    if name != StorageProvider.S3:
        raise StorageMisconfiguredError(
            f"Unknown ILIA_STORAGE_PROVIDER {name!r}. Supported: s3, local"
        )

    missing = [
        field
        for field, value in (
            ("ILIA_STORAGE_BUCKET", settings.storage_bucket),
            ("ILIA_STORAGE_ACCESS_KEY", settings.storage_access_key),
            ("ILIA_STORAGE_SECRET_KEY", settings.storage_secret_key),
        )
        if not value.strip()
    ]
    if missing:
        raise StorageMisconfiguredError(f"Storage provider 's3' needs {', '.join(missing)}")

    # Bucket and endpoint are logged; the keys never are.
    logger.info(
        "storage_configured",
        bucket=settings.storage_bucket,
        endpoint=settings.storage_endpoint or "aws",
    )

    return S3CompatibleStorage(
        bucket=settings.storage_bucket.strip(),
        region=settings.storage_region.strip(),
        access_key=settings.storage_access_key.strip(),
        secret_key=settings.storage_secret_key.strip(),
        endpoint=settings.storage_endpoint.strip(),
    )
