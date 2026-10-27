"""ORM mapping for the catalog.

Storage, not domain. `Course` in `domain/entities.py` is the domain.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.schemas import DbSchema


class CourseModel(Base):
    __tablename__ = "course"

    # The index the catalog listing actually needs.
    #
    # A plain index on `published_at` does not serve this query: it orders by
    # `coalesce(published_at, created_at)`, and Postgres will not use a column
    # index for an expression. Partial on `status = 'published'` because that is
    # the only slice the catalog ever reads, which keeps the index small and
    # leaves drafts out of it entirely.
    __table_args__ = (
        # Declared as two separate expressions, not one string holding both.
        # Postgres reports the index that way, and Alembic compares them
        # element by element — a single combined expression makes autogenerate
        # believe the index changed on every future migration and churn it.
        Index(
            "ix_course_catalog_keyset",
            text("coalesce(published_at, created_at) DESC"),
            text("id DESC"),
            postgresql_where=text("status = 'published'"),
        ),
        {"schema": DbSchema.CATALOG.value},
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="beginner")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")

    # Indexed: every instructor screen filters by it — their course list, the
    # ownership check on each edit, and the review inbox. Without it those are
    # sequential scans of every course on the platform.
    instructor_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("identity.app_user.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Null while the course is a draft. No index of its own: the partial keyset
    # index above already covers every read the catalog performs, and a second
    # one would only be paid for on every write.
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    modules: Mapped[list["ModuleModel"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="ModuleModel.position",
        primaryjoin="CourseModel.id == ModuleModel.course_id",
    )


class ModuleModel(Base):
    __tablename__ = "course_module"
    __table_args__ = (
        UniqueConstraint("id", "course_id", name="uq_course_module_id_course"),
        {"schema": DbSchema.CATALOG.value},
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    course_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("catalog.course.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    course: Mapped[CourseModel] = relationship(
        back_populates="modules", primaryjoin="ModuleModel.course_id == CourseModel.id"
    )
    lessons: Mapped[list["LessonModel"]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="LessonModel.position",
        primaryjoin=(
            "and_(ModuleModel.id == LessonModel.module_id, "
            "ModuleModel.course_id == LessonModel.course_id)"
        ),
    )


class LessonModel(Base):
    __tablename__ = "lesson"
    __table_args__ = (
        UniqueConstraint("id", "course_id", name="uq_lesson_id_course"),
        ForeignKeyConstraint(
            ["module_id", "course_id"],
            ["catalog.course_module.id", "catalog.course_module.course_id"],
            ondelete="CASCADE",
            name="fk_lesson_module_course",
        ),
        Index("ix_lesson_module_course", "module_id", "course_id"),
        {"schema": DbSchema.CATALOG.value},
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    module_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Body for a text lesson. Empty for the other kinds, which point at a
    # resource instead.
    #
    # `server_default` and not just `default`: adding a NOT NULL column to a
    # table that already has rows fails without one, and that failure happens
    # during the deploy, against real data.
    body: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")
    # Reference into object storage for video and slides. Stored as a plain
    # reference, never as a ready-to-use URL: media is served through a signed
    # URL with an expiry (TRD 11), and a permanent link in the database would
    # defeat that the first time someone copies it.
    resource_ref: Mapped[str | None] = mapped_column(String(500), nullable=True)

    module: Mapped[ModuleModel] = relationship(
        back_populates="lessons",
        primaryjoin=(
            "and_(LessonModel.module_id == ModuleModel.id, "
            "LessonModel.course_id == ModuleModel.course_id)"
        ),
    )
