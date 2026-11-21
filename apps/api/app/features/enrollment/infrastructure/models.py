"""ORM mapping for enrollment and progress."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.schemas import DbSchema


class EnrollmentModel(Base):
    __tablename__ = "enrollment"

    # One enrollment per teacher per course. The application checks first, but
    # two taps on a slow connection both pass that check — the constraint is the
    # guarantee.
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_enrollment_user_course"),
        UniqueConstraint("id", "course_id", name="uq_enrollment_id_course"),
        {"schema": DbSchema.LEARNING.value},
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("identity.app_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("catalog.course.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Which in-person talk the enrollment came from. SET NULL preserves the
    # student's course history if a cohort is removed.
    cohort_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning.cohort.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class LessonProgressModel(Base):
    __tablename__ = "lesson_progress"

    # Keyed on the enrollment, not on the user: progress cannot exist without an
    # enrollment, and making that a foreign key means the schema enforces it
    # rather than every use case having to remember.
    __table_args__ = (
        UniqueConstraint("enrollment_id", "lesson_id", name="uq_progress_enrollment_lesson"),
        CheckConstraint("position_seconds >= 0", name="ck_lesson_progress_position_nonnegative"),
        ForeignKeyConstraint(
            ["enrollment_id", "course_id"],
            ["learning.enrollment.id", "learning.enrollment.course_id"],
            ondelete="CASCADE",
            name="fk_progress_enrollment_course",
        ),
        ForeignKeyConstraint(
            ["lesson_id", "course_id"],
            ["catalog.lesson.id", "catalog.lesson.course_id"],
            ondelete="CASCADE",
            name="fk_progress_lesson_course",
        ),
        Index("ix_progress_enrollment_course", "enrollment_id", "course_id"),
        Index("ix_progress_lesson_course", "lesson_id", "course_id"),
        {"schema": DbSchema.LEARNING.value},
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    lesson_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    position_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )
