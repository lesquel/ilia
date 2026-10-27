"""In-memory user repository.

**Temporary.** The database is still an open decision (TRD 2.4), and this exists
so the auth vertical slice can be finished and tested end to end without waiting
for it. It is the whole point of the port: when PostgreSQL is confirmed, a
`SqlAlchemyUserRepository` lands beside this file and nothing in `domain`,
`application` or `interface` changes.

Do not ship this. It loses every account on restart.
"""

import asyncio
from uuid import UUID

from app.features.auth.domain.entities import Email, User


class InMemoryUserRepository:
    def __init__(self, users: list[User] | None = None) -> None:
        self._by_id: dict[UUID, User] = {}
        self._lock = asyncio.Lock()
        for user in users or []:
            self._by_id[user.id] = user

    async def get_by_id(self, user_id: UUID) -> User | None:
        return self._by_id.get(user_id)

    async def get_by_ids(self, user_ids: set[UUID]) -> list[User]:
        return [user for user_id, user in self._by_id.items() if user_id in user_ids]

    async def get_by_email(self, email: Email) -> User | None:
        for user in self._by_id.values():
            if user.email == email:
                return user
        return None

    async def add(self, user: User) -> None:
        # A real database enforces uniqueness with a constraint. Here the lock is
        # what stops two concurrent registrations of the same address from both
        # passing the existence check.
        async with self._lock:
            for existing in self._by_id.values():
                if existing.email == user.email:
                    raise ValueError("Email already registered")
            self._by_id[user.id] = user

    async def update(self, user: User) -> None:
        async with self._lock:
            self._by_id[user.id] = user
