"""PostgreSQL storage for password reset tokens."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update

from app.core.database import Database
from app.features.auth.domain.entities import PasswordResetToken

from .models import PasswordResetTokenModel


def _to_entity(row: PasswordResetTokenModel) -> PasswordResetToken:
    return PasswordResetToken(
        id=row.id,
        user_id=row.user_id,
        token_hash=row.token_hash,
        expires_at=row.expires_at,
        used_at=row.used_at,
        created_at=row.created_at,
    )


class SqlAlchemyPasswordResetTokenRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def save(self, token: PasswordResetToken) -> None:
        async with self._db.session() as session:
            session.add(
                PasswordResetTokenModel(
                    id=token.id,
                    user_id=token.user_id,
                    token_hash=token.token_hash,
                    expires_at=token.expires_at,
                    used_at=token.used_at,
                    created_at=token.created_at,
                )
            )

    async def invalidate_unused_for_user(self, user_id: UUID) -> None:
        async with self._db.session() as session:
            await session.execute(
                update(PasswordResetTokenModel)
                .where(
                    PasswordResetTokenModel.user_id == user_id,
                    PasswordResetTokenModel.used_at.is_(None),
                )
                .values(used_at=datetime.now().astimezone())
            )

    async def get_active_for_user(
        self, user_id: UUID, *, at: datetime
    ) -> PasswordResetToken | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(PasswordResetTokenModel)
                .where(
                    PasswordResetTokenModel.user_id == user_id,
                    PasswordResetTokenModel.used_at.is_(None),
                    PasswordResetTokenModel.expires_at > at,
                )
                .order_by(PasswordResetTokenModel.created_at.desc())
                .limit(1)
            )
            row = result.scalar_one_or_none()
            return _to_entity(row) if row else None

    async def mark_used(self, token_id: UUID, *, used_at: datetime) -> None:
        async with self._db.session() as session:
            await session.execute(
                update(PasswordResetTokenModel)
                .where(PasswordResetTokenModel.id == token_id)
                .values(used_at=used_at)
            )
