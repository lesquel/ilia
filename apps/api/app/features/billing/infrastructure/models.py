"""ORM mapping for plans and subscriptions."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PlanModel(Base):
    """A plan, as data.

    Quotas and prices are rows, not constants: PRD open question 4 leaves the
    numbers open, and a limit hardcoded in Python needs a deploy to move.
    """

    __tablename__ = "plan"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")

    # NULL means unlimited. 0 means none at all — a different thing, and
    # conflating them is how a paid plan silently stops working.
    monthly_evaluations: Mapped[int | None] = mapped_column(Integer, nullable=True)
    allowed_levels: Mapped[list] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=False, server_default='["beginner"]', default=list
    )
    can_issue_certificates: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    can_post_in_forum: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    # NULL while pricing is undecided. Showing a price nobody agreed to is
    # worse than showing none.
    price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )


class SubscriptionModel(Base):
    __tablename__ = "subscription"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    # One live subscription per teacher. Two would make "which plan am I on?"
    # a question with two answers.
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    plan_code: Mapped[str] = mapped_column(
        String(40), ForeignKey("plan.code", ondelete="RESTRICT"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # NULL means it does not expire, which is what the free plan is.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
