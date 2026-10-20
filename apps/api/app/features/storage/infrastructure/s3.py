"""Any storage speaking the S3 API.

One adapter covers AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces and
Backblaze B2 — the same insight as the OpenAI-compatible LLM adapter. What
changes between them is an endpoint and a region string.
"""

from datetime import UTC, datetime, timedelta

import httpx

from app.features.storage.domain.ports import SignedUrl
from app.features.storage.infrastructure.sigv4 import presign


class S3CompatibleStorage:
    def __init__(
        self,
        *,
        bucket: str,
        region: str,
        access_key: str,
        secret_key: str,
        endpoint: str = "",
        provider: str = "s3",
    ) -> None:
        self._bucket = bucket
        self._region = region
        self._access_key = access_key
        self._secret_key = secret_key
        self._provider = provider

        # Path-style against a custom endpoint (MinIO, R2), virtual-host style
        # against AWS. Both are signed the same way; only the host and the
        # leading path segment move.
        if endpoint:
            self._host = endpoint.replace("https://", "").replace("http://", "").rstrip("/")
            self._prefix = f"/{bucket}"
            self._scheme = "http" if endpoint.startswith("http://") else "https"
        else:
            self._host = f"{bucket}.s3.{region}.amazonaws.com"
            self._prefix = ""
            self._scheme = "https"

    @property
    def provider(self) -> str:
        return self._provider

    def _signed(self, method: str, reference: str, ttl: timedelta, **query: str) -> SignedUrl:
        url = presign(
            method=method,
            host=self._host,
            path=f"{self._prefix}/{reference.lstrip('/')}",
            region=self._region,
            access_key=self._access_key,
            secret_key=self._secret_key,
            now=datetime.now(UTC),
            ttl=ttl,
            scheme=self._scheme,
            extra_query=query or None,
        )
        return SignedUrl(url=url, expires_in_seconds=int(ttl.total_seconds()))

    def read_url(self, reference: str, *, ttl: timedelta) -> SignedUrl:
        return self._signed("GET", reference, ttl)

    def write_url(self, reference: str, *, content_type: str, ttl: timedelta) -> SignedUrl:
        # The content type is signed, so a URL issued for a video cannot be used
        # to upload an HTML page that would then be served from our domain.
        return self._signed("PUT", reference, ttl, **{"Content-Type": content_type})

    async def read_bytes(self, reference: str, *, max_bytes: int) -> bytes:
        """Read no more than max_bytes + 1, so oversized objects are rejected."""
        signed = self.read_url(reference, ttl=timedelta(seconds=30))
        async with (
            httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client,
            client.stream("GET", signed.url) as response,
        ):
            response.raise_for_status()
            content_length = response.headers.get("content-length")
            if content_length is not None and int(content_length) > max_bytes:
                raise ValueError("avatar_image_too_large")
            content = bytearray()
            async for chunk in response.aiter_bytes():
                content.extend(chunk)
                if len(content) > max_bytes:
                    raise ValueError("avatar_image_too_large")
            return bytes(content)

    async def delete(self, reference: str) -> None:
        signed = self._signed("DELETE", reference, timedelta(seconds=30))
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            response = await client.delete(signed.url)
            response.raise_for_status()

