"""Choosing a storage provider from configuration."""

from datetime import timedelta

import pytest

from app.core.config import Settings
from app.features.storage.infrastructure.local import LocalStorage
from app.features.storage.infrastructure.registry import (
    StorageMisconfiguredError,
    build_storage,
)
from app.features.storage.infrastructure.s3 import S3CompatibleStorage

S3_SETTINGS = {
    "storage_provider": "s3",
    "storage_bucket": "ilia-media",
    "storage_access_key": "AKIAEXAMPLE",
    "storage_secret_key": "secreto",
}


class TestSelection:
    def test_no_provider_runs_the_local_adapter_in_development(self) -> None:
        assert isinstance(build_storage(Settings()), LocalStorage)

    def test_production_refuses_the_local_adapter(self) -> None:
        # It signs nothing and serves media through the API. Discovering that
        # in production means paid content behind a guessable path.
        with pytest.raises(StorageMisconfiguredError):
            build_storage(
                Settings(
                    environment="production",
                    jwt_secret="x" * 40,
                    database_url="postgresql+asyncpg://ilia:ilia@db:5432/ilia",
                    cookie_secure=True,
                )
            )

    def test_s3_builds(self) -> None:
        assert isinstance(build_storage(Settings(**S3_SETTINGS)), S3CompatibleStorage)

    def test_missing_credentials_fail_at_startup(self) -> None:
        # Not when a teacher presses play: that costs them a lesson and tells
        # them nothing.
        with pytest.raises(StorageMisconfiguredError):
            build_storage(Settings(storage_provider="s3", storage_bucket="ilia-media"))

    def test_an_unknown_provider_fails_at_startup(self) -> None:
        with pytest.raises(StorageMisconfiguredError):
            build_storage(Settings(**{**S3_SETTINGS, "storage_provider": "dropbox"}))


class TestUrls:
    def storage(self, **over: str) -> S3CompatibleStorage:
        settings = Settings(**{**S3_SETTINGS, **over})
        built = build_storage(settings)
        assert isinstance(built, S3CompatibleStorage)
        return built

    def test_a_read_url_is_signed_and_expires(self) -> None:
        signed = self.storage().read_url("lecciones/clase-1.mp4", ttl=timedelta(minutes=30))

        assert "X-Amz-Signature=" in signed.url
        assert "X-Amz-Expires=1800" in signed.url
        assert signed.expires_in_seconds == 1800

    def test_aws_uses_virtual_host_style_and_a_custom_endpoint_uses_paths(self) -> None:
        aws = self.storage().read_url("clase.mp4", ttl=timedelta(minutes=5)).url
        minio = (
            self.storage(storage_endpoint="http://localhost:9000")
            .read_url("clase.mp4", ttl=timedelta(minutes=5))
            .url
        )

        assert aws.startswith("https://ilia-media.s3.us-east-1.amazonaws.com/clase.mp4?")
        # Path style, and the scheme follows the endpoint rather than being
        # forced to https — a local MinIO has no certificate.
        assert minio.startswith("http://localhost:9000/ilia-media/clase.mp4?")

    def test_the_secret_never_reaches_the_url(self) -> None:
        url = self.storage().read_url("clase.mp4", ttl=timedelta(minutes=5)).url

        assert "secreto" not in url
        assert "AKIAEXAMPLE" in url

    def test_an_upload_url_is_bound_to_its_content_type(self) -> None:
        # Otherwise a URL issued for a video could upload an HTML page, which
        # would then be served from our own domain.
        signed = self.storage().write_url(
            "clase.mp4", content_type="video/mp4", ttl=timedelta(minutes=15)
        )

        assert "Content-Type=video%2Fmp4" in signed.url
        assert "X-Amz-Signature=" in signed.url

    def test_the_local_adapter_refuses_uploads_rather_than_faking_them(self) -> None:
        # A dev adapter that pretended uploads worked would hide the one thing
        # that has to be tested against a real bucket before launch.
        with pytest.raises(NotImplementedError):
            LocalStorage().write_url("clase.mp4", content_type="video/mp4", ttl=timedelta(1))
