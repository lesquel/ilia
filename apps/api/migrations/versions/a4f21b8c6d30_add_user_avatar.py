"""Add optional illustrated and uploaded profile avatars to users."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a4f21b8c6d30"
down_revision: str | Sequence[str] | None = "3d9a6b1e7c20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("app_user", sa.Column("avatar_key", sa.String(length=40), nullable=True), schema="auth")
    op.add_column("app_user", sa.Column("avatar_ref", sa.String(length=512), nullable=True), schema="auth")
    op.create_check_constraint(
        "ck_app_user_avatar_choice",
        "app_user",
        "avatar_key IS NULL OR avatar_ref IS NULL",
        schema="auth",
    )


def downgrade() -> None:
    op.drop_constraint("ck_app_user_avatar_choice", "app_user", schema="auth")
    op.drop_column("app_user", "avatar_ref", schema="auth")
    op.drop_column("app_user", "avatar_key", schema="auth")
