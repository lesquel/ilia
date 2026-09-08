"""ORM mapping for the forum."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ForumThreadModel(Base):
    __tablename__ = "forum_thread"

    # The listing reads a course's threads newest-activity-first, so that is the
    # index. Without it every forum page load sorts the whole table.
    __table_args__ = (Index("ix_forum_thread_course_activity", "course_id", "last_activity_at"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("course.id", ondelete="CASCADE"), nullable=False
    )
    # Null means the thread belongs to the course as a whole — which is what the
    # mockup shows ("Foro del curso"), despite what PRD open question 8 claims.
    module_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("course_module.id", ondelete="CASCADE"), nullable=True
    )
    author_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False
    )
    # Copied so a thread still shows who wrote it after the account is gone.
    author_name: Mapped[str] = mapped_column(String(120), nullable=False)

    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    reply_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Denormalized on purpose: ordering a forum by a computed max() over every
    # reply is a sort the database redoes on every page load.
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    is_hidden: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    hidden_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class ForumPostModel(Base):
    __tablename__ = "forum_post"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    thread_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("forum_thread.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False
    )
    author_name: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    is_hidden: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    hidden_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
