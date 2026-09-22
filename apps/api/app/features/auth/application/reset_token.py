"""Helpers for single-use password reset tokens.

The raw token embeds the user id so confirmation can load the right row without
scanning the whole table. The secret half is still high-entropy; knowing a user
id alone is not enough to reset an account.
"""

import secrets
from datetime import timedelta
from uuid import UUID, uuid4

from app.features.auth.domain.entities import PasswordResetToken
from app.features.auth.domain.ports import Clock, PasswordHasher


def parse_reset_token(raw: str) -> UUID | None:
    head, _, tail = raw.partition(".")
    if not tail:
        return None
    try:
        return UUID(head)
    except ValueError:
        return None


def mint_reset_token(
    *,
    user_id: UUID,
    hasher: PasswordHasher,
    clock: Clock,
    ttl: timedelta,
) -> tuple[str, PasswordResetToken]:
    raw = f"{user_id}.{secrets.token_urlsafe(32)}"
    now = clock.now()
    entity = PasswordResetToken(
        id=uuid4(),
        user_id=user_id,
        token_hash=hasher.hash(raw),
        expires_at=now + ttl,
        created_at=now,
    )
    return raw, entity
