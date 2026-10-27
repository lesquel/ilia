from collections.abc import AsyncIterator
from typing import Any, ClassVar

import pytest

from app.features.storage.domain.ports import SignedUrl
from app.features.storage.infrastructure import s3 as s3_module
from app.features.storage.infrastructure.s3 import S3CompatibleStorage


class FakeResponse:
    def __init__(self, *, headers: dict[str, str], chunks: list[bytes]) -> None:
        self.headers = headers
        self._chunks = chunks

    def raise_for_status(self) -> None:
        return

    async def __aenter__(self) -> "FakeResponse":
        return self

    async def __aexit__(self, *args: object) -> None:
        return

    async def aiter_bytes(self) -> AsyncIterator[bytes]:
        for chunk in self._chunks:
            yield chunk


class FakeClient:
    response: FakeResponse
    deleted: ClassVar[list[str]] = []

    def __init__(self, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return

    def stream(self, method: str, url: str) -> FakeResponse:
        assert method == "GET"
        assert url == "https://storage.example/avatar"
        return self.response

    async def delete(self, url: str) -> FakeResponse:
        self.deleted.append(url)
        return FakeResponse(headers={}, chunks=[])


def storage() -> S3CompatibleStorage:
    result = S3CompatibleStorage(
        bucket="avatars",
        region="us-east-1",
        access_key="access",
        secret_key="secret",
    )
    result._signed = lambda *args, **kwargs: SignedUrl(  # type: ignore[method-assign]
        "https://storage.example/avatar", 30
    )
    return result


def mock_httpx(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        s3_module,
        "httpx",
        type("Httpx", (), {"AsyncClient": FakeClient}),
        raising=False,
    )


@pytest.mark.asyncio
async def test_reads_small_object_bytes_with_a_strict_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    FakeClient.response = FakeResponse(headers={"content-length": "4"}, chunks=[b"RIFF", b"WEBP"])
    mock_httpx(monkeypatch)

    assert await storage().read_bytes("avatars/person/photo", max_bytes=8) == b"RIFFWEBP"


@pytest.mark.asyncio
async def test_rejects_large_object_before_reading_chunks(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeClient.response = FakeResponse(headers={"content-length": "9"}, chunks=[])
    mock_httpx(monkeypatch)

    with pytest.raises(ValueError, match="avatar_image_too_large"):
        await storage().read_bytes("avatars/person/photo", max_bytes=8)


@pytest.mark.asyncio
async def test_deletes_using_a_short_lived_signed_url(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeClient.deleted = []
    mock_httpx(monkeypatch)

    await storage().delete("avatars/person/photo")

    assert FakeClient.deleted == ["https://storage.example/avatar"]
