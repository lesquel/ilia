"""ORM mapping for enrollment and progress."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EnrollmentModel(Base):
    __tablename__ = "enrollment"

    # One enrollment per teacher per course. The application checks first, but
    # two taps on a slow connection both pass that check — the constraint is the
    # guarantee.
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_enrollment_user_course"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("course.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Which in-person talk this teacher came from. SET NULL rather than CASCADE:
    # deleting a cohort record must never delete a teacher's enrollment.
    cohort_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("cohort.id", ondelete="SET NULL"), nullable=True, index=True
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
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("enrollment.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lesson.id", ondelete="CASCADE"), nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
