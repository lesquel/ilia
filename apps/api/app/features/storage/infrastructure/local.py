"""Files on disk, for local development.

**Not for production**, and it says so at startup. There is no signature and no
expiry: it hands back a path served by the API itself, which is exactly the
bandwidth problem the port exists to avoid. It is here so the whole lesson flow
can be built and demonstrated before anyone has decided on a bucket.
"""

from datetime import timedelta

from app.features.storage.domain.ports import SignedUrl


class LocalStorage:
    def __init__(self, base_url: str = "/media") -> None:
        self._base_url = base_url.rstrip("/")

    @property
    def provider(self) -> str:
        return "local"

    def read_url(self, reference: str, *, ttl: timedelta) -> SignedUrl:
        return SignedUrl(
            url=f"{self._base_url}/{reference.lstrip('/')}",
            expires_in_seconds=int(ttl.total_seconds()),
        )

    def write_url(self, reference: str, *, content_type: str, ttl: timedelta) -> SignedUrl:
        # Deliberately unimplemented rather than faked. A dev adapter that
        # pretended uploads worked would hide the one thing that has to be
        # tested against a real bucket before launch.
        raise NotImplementedError("Uploads need real object storage. Set ILIA_STORAGE_PROVIDER.")

    async def read_bytes(self, reference: str, *, max_bytes: int) -> bytes:
        raise NotImplementedError("Uploads need real object storage. Set ILIA_STORAGE_PROVIDER.")

    async def delete(self, reference: str) -> None:
        raise NotImplementedError("Uploads need real object storage. Set ILIA_STORAGE_PROVIDER.")

