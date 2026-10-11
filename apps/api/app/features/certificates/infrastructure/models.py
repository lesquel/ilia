"""ORM mapping for certificates."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.schemas import DbSchema


class CertificateModel(Base):
    __tablename__ = "certificate"

    # One certificate per teacher per course. Two codes for one achievement is
    # two things to verify and one to explain.
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_certificate_user_course"), {"schema": DbSchema.LEARNING.value})

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("auth.app_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("catalog.course.id", ondelete="CASCADE"), nullable=False
    )
    # The public identifier. Indexed and unique because verification looks the
    # certificate up by this and nothing else.
    code: Mapped[str] = mapped_column(String(16), nullable=False, unique=True, index=True)

    # Copied at issue time, not joined at verification time. A certificate
    # states what was true when it was earned; a verification page that changes
    # because someone edited their profile is not a verification page.
    holder_name: Mapped[str] = mapped_column(String(120), nullable=False)
    course_title: Mapped[str] = mapped_column(String(200), nullable=False)

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="valid", default="valid"
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_by: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("auth.app_user.id", ondelete="SET NULL"), nullable=True
    )
