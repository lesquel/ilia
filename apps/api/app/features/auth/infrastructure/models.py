"""ORM mapping for the auth feature.

These classes are **not** the domain. `User` in `domain/entities.py` is the
domain; this is how it is stored. The repository translates between the two, so
a column rename never reaches a use case.
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.schemas import DbSchema


class CohortModel(Base):
    """A group of teachers coming from one in-person talk.

    Created now, ahead of the enrollment feature, because the TRD is right that
    adding it later means migrating live teacher data. It is also what makes the
    first success metric of PRD 12 answerable — *what share of the teachers at a
    given talk activated an account* — which is the number that proves the
    alliance with the Alcaldía is working.
    """

    __tablename__ = "cohort"
    __table_args__ = ({"schema": DbSchema.LEARNING.value},)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    # Short code handed out at the talk, so a teacher can attach their new
    # account to the session they attended.
    code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    starts_on: Mapped[date | None] = mapped_column(Date(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class UserModel(Base):
    __tablename__ = "app_user"
    __table_args__ = (
        Index("uq_app_user_email", "email", unique=True),
        {"schema": DbSchema.AUTH.value},
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    # Stored already normalized by the domain. The unique index is what actually
    # enforces it: two concurrent registrations both pass an existence check,
    # and only the constraint stops the second one.
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # See `User.token_generation`. Server default so the column can be added to
    # a table that already has rows.
    token_generation: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PasswordResetTokenModel(Base):
    __tablename__ = "password_reset_token"
    __table_args__ = ({"schema": DbSchema.AUTH.value},)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("identity.app_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
