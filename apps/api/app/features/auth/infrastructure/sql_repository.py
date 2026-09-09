"""PostgreSQL implementation of the auth ports.

The point of the port: nothing in `domain`, `application` or `interface` changed
to make this exist. It simply took the place of `InMemoryUserRepository`.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.exc import IntegrityError

from app.core.database import Database
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.domain.errors import EmailAlreadyRegisteredError

from .models import UserModel


def _to_entity(row: UserModel) -> User:
    return User(
        id=row.id,
        email=Email(row.email),
        full_name=row.full_name,
        password_hash=row.password_hash,
        role=Role(row.role),
        is_active=row.is_active,
        created_at=row.created_at,
        token_generation=row.token_generation,
    )


class SqlAlchemyUserRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def get_by_id(self, user_id: UUID) -> User | None:
        async with self._db.session() as session:
            row = await session.get(UserModel, user_id)
            return _to_entity(row) if row else None

    async def get_by_email(self, email: Email) -> User | None:
        async with self._db.session() as session:
            result = await session.execute(select(UserModel).where(UserModel.email == email.value))
            row = result.scalar_one_or_none()
            return _to_entity(row) if row else None

    async def add(self, user: User) -> None:
        try:
            async with self._db.session() as session:
                session.add(
                    UserModel(
                        id=user.id,
                        email=user.email.value,
                        full_name=user.full_name,
                        password_hash=user.password_hash,
                        role=user.role.value,
                        is_active=user.is_active,
                        created_at=user.created_at,
                        token_generation=user.token_generation,
                    )
                )
        except IntegrityError as exc:
            # The use case already checked, but two concurrent registrations
            # both pass that check. The unique index is the real guarantee, and
            # this turns its error into the domain's own.
            raise EmailAlreadyRegisteredError() from exc

    async def update(self, user: User) -> None:
        async with self._db.session() as session:
            await session.execute(
                sa_update(UserModel)
                .where(UserModel.id == user.id)
                .values(
                    full_name=user.full_name,
                    password_hash=user.password_hash,
                    role=user.role.value,
                    is_active=user.is_active,
                    token_generation=user.token_generation,
                )
            )
