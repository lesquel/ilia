"""What object storage looks like from inside ILIA.

Only two operations, and both hand out a URL rather than moving bytes.

**Why the API never streams the file.** A course video is tens of megabytes and
a municipality's worth of teachers watch it at nine in the morning. Proxying
that through the Python process turns a CDN's job into our bottleneck and our
bandwidth bill. The API answers "where is it and are you allowed", the storage
serves it.

**Why the URL expires.** Course content is what the paid plans sell. A
permanent public URL is a link one person can paste into a staff group and hand
the whole catalogue away — no login, no plan, no way to take it back.
"""

from dataclasses import dataclass
from datetime import timedelta
from typing import Protocol


@dataclass(frozen=True)
class SignedUrl:
    url: str
    expires_in_seconds: int


class ObjectStorage(Protocol):
    @property
    def provider(self) -> str: ...

    def read_url(self, reference: str, *, ttl: timedelta) -> SignedUrl:
        """A temporary URL a browser can play or download.

        `reference` is the opaque key stored on the lesson, never a path the
        client composes: a client that builds keys is a client that can ask for
        someone else's.
        """
        ...

    def write_url(self, reference: str, *, content_type: str, ttl: timedelta) -> SignedUrl:
        """A temporary URL an instructor's browser can upload straight to.

        Direct to the storage, not through us: a hundred-megabyte upload
        travelling through the API holds a worker for minutes and buys nothing.
        """
        ...
