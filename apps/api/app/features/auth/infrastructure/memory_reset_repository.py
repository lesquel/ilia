"""In-memory password reset tokens — for tests and the no-database dev path."""

import asyncio
from datetime import datetime
from uuid import UUID

from app.features.auth.domain.entities import PasswordResetToken


class InMemoryPasswordResetTokenRepository:
    def __init__(self) -> None:
        self._tokens: list[PasswordResetToken] = []
        self._lock = asyncio.Lock()

    async def save(self, token: PasswordResetToken) -> None:
        async with self._lock:
            self._tokens.append(token)

    async def invalidate_unused_for_user(self, user_id: UUID) -> None:
        async with self._lock:
            now = datetime.now().astimezone()
            for entry in self._tokens:
                if entry.user_id == user_id and entry.used_at is None:
                    entry.used_at = now

    async def get_active_for_user(
        self, user_id: UUID, *, at: datetime
    ) -> PasswordResetToken | None:
        async with self._lock:
            candidates = [
                t
                for t in self._tokens
                if t.user_id == user_id and t.used_at is None and t.expires_at > at
            ]
            if not candidates:
                return None
            return max(candidates, key=lambda t: t.created_at or t.expires_at)

    async def mark_used(self, token_id: UUID, *, used_at: datetime) -> None:
        async with self._lock:
            for entry in self._tokens:
                if entry.id == token_id:
                    entry.used_at = used_at
                    return
