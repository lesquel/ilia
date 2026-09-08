"""Opaque keyset cursor.

Encodes the sort key of the last row of a page — `(published_at, id)` — so the
next page can resume exactly after it.

Two properties matter:

- **Stable.** A course published while a teacher scrolls does not shift the rows
  behind them, which is what `OFFSET` cannot promise.
- **Untrusted.** The cursor arrives from the client, so anything malformed is
  rejected outright rather than coerced into something that silently returns the
  wrong page.

It is base64 for opacity, not for secrecy: it is not signed and anyone can decode
it. Never put anything in here that is not already public.
"""

import base64
import binascii
from datetime import UTC, datetime
from uuid import UUID

from app.features.catalog.domain.errors import InvalidCursorError

_SEPARATOR = "|"


def encode_cursor(published_at: datetime | None, course_id: UUID) -> str:
    timestamp = published_at.astimezone(UTC).isoformat() if published_at else ""
    raw = f"{timestamp}{_SEPARATOR}{course_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime | None, UUID]:
    padding = "=" * (-len(cursor) % 4)

    try:
        raw = base64.urlsafe_b64decode(cursor + padding).decode()
        timestamp, _, identifier = raw.partition(_SEPARATOR)
        course_id = UUID(identifier)
        published_at = datetime.fromisoformat(timestamp) if timestamp else None
    except (ValueError, binascii.Error, UnicodeDecodeError) as exc:
        raise InvalidCursorError() from exc

    return published_at, course_id
