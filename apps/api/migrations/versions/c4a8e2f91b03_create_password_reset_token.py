"""Create password_reset_token for recover-password flow.

Revision ID: c4a8e2f91b03
Revises: b7e2c1a90d44
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4a8e2f91b03"
down_revision: str | Sequence[str] | None = "b7e2c1a90d44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "password_reset_token",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_password_reset_token_user_id"),
        "password_reset_token",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_password_reset_token_user_id"), table_name="password_reset_token")
    op.drop_table("password_reset_token")
