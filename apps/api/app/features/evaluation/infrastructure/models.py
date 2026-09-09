"""ORM mapping for activities, rubrics, submissions and evaluations."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RubricModel(Base):
    __tablename__ = "rubric"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    # Bumped whenever an instructor edits the dimensions. A submission stores
    # the version it was judged under, so a grade stays explainable after the
    # rubric moves on (TRD 6.3).
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str] = mapped_column(String(160), nullable=False, default="")

    dimensions: Mapped[list["RubricDimensionModel"]] = relationship(
        back_populates="rubric", cascade="all, delete-orphan", order_by="RubricDimensionModel.key"
    )


class RubricDimensionModel(Base):
    __tablename__ = "rubric_dimension"

    __table_args__ = (UniqueConstraint("rubric_id", "key", name="uq_dimension_rubric_key"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    rubric_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rubric.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="prompt")
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    rubric: Mapped[RubricModel] = relationship(back_populates="dimensions")


class ActivityModel(Base):
    __tablename__ = "activity"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    module_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("course_module.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("course.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rubric_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rubric.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    # The deterministic requirements, as JSON. A column per check would need a
    # migration every time a new kind of check is invented, and these are read
    # as a whole or not at all.
    checks: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=False, server_default="{}", default=dict
    )

    rubric: Mapped[RubricModel] = relationship()


class SubmissionModel(Base):
    __tablename__ = "submission"

    __table_args__ = (
        UniqueConstraint("user_id", "activity_id", "attempt", name="uq_submission_attempt"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    activity_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("activity.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The teacher's prompt, kept verbatim. It can contain their own pupils'
    # names and marks (TRD 11) — which is exactly why retention needs deciding
    # before this runs at municipal scale.
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    failure_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    recoveries: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Touched on every status change. This is what tells a starting process
    # which submissions were abandoned by a previous one, as opposed to which
    # are being worked on right now by a sibling replica.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ModelOutputModel(Base):
    __tablename__ = "model_output"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    submission_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("submission.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")
    model: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    model_version: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class EvaluationModel(Base):
    __tablename__ = "evaluation"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    submission_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("submission.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    rubric_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    passed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    feedback: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")
    suggestion: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")
    check_failures: Mapped[list] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=False, server_default="[]", default=list
    )
    model: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    model_version: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # An instructor's override sits BESIDE the automatic mark, never on top of
    # it (PRD I-03). Overwriting would destroy the audit trail that makes the
    # override defensible in the first place.
    override_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    override_by: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True
    )
    override_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    scores: Mapped[list["EvaluationScoreModel"]] = relationship(
        back_populates="evaluation", cascade="all, delete-orphan"
    )


class EvaluationScoreModel(Base):
    __tablename__ = "evaluation_score"

    __table_args__ = (
        UniqueConstraint("evaluation_id", "dimension_key", name="uq_score_evaluation_dimension"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    evaluation_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("evaluation.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dimension_key: Mapped[str] = mapped_column(String(60), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    justification: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")

    evaluation: Mapped[EvaluationModel] = relationship(back_populates="scores")


class LlmUsageModel(Base):
    """One row per evaluation, so "what does a student cost me?" has an answer.

    Kept even when the submission is deleted — the cost was still incurred, and
    a cost report with holes in it is not a cost report.
    """

    __tablename__ = "llm_usage"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    submission_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("submission.id", ondelete="SET NULL"), nullable=True
    )
    model: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
