"""Scope module forum threads to an optional enrollment cohort.

Revision ID: c92b5a1e7f34
Revises: c91a4e7d2f60
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c92b5a1e7f34"
down_revision: str | Sequence[str] | None = "c91a4e7d2f60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "forum_thread",
        sa.Column("cohort_id", sa.Uuid(), nullable=True),
        schema="community",
    )
    op.create_foreign_key(
        "fk_forum_thread_cohort",
        "forum_thread",
        "cohort",
        ["cohort_id"],
        ["id"],
        source_schema="community",
        referent_schema="learning",
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_forum_thread_forum_activity",
        "forum_thread",
        ["course_id", "module_id", "cohort_id", "last_activity_at"],
        schema="community",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_forum_thread_forum_activity", table_name="forum_thread", schema="community"
    )
    op.drop_constraint(
        "fk_forum_thread_cohort", "forum_thread", schema="community", type_="foreignkey"
    )
    op.drop_column("forum_thread", "cohort_id", schema="community")
