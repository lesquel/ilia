"""Add optional illustrated and uploaded profile avatars to users."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a4f21b8c6d30"
down_revision: str | Sequence[str] | None = "3d9a6b1e7c20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _user_schema() -> str:
    """Where app_user lives: c8f1a2b34d50 moves it from auth to identity on a
    parallel branch, so this migration must not assume the order."""
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT to_regclass('identity.app_user')")).scalar():
        return "identity"
    return "auth"


def upgrade() -> None:
    schema = _user_schema()
    op.add_column(
        "app_user", sa.Column("avatar_key", sa.String(length=40), nullable=True), schema=schema
    )
    op.add_column(
        "app_user", sa.Column("avatar_ref", sa.String(length=512), nullable=True), schema=schema
    )
    op.create_check_constraint(
        "ck_app_user_avatar_choice",
        "app_user",
        "avatar_key IS NULL OR avatar_ref IS NULL",
        schema=schema,
    )


def downgrade() -> None:
    schema = _user_schema()
    op.drop_constraint("ck_app_user_avatar_choice", "app_user", schema=schema)
    op.drop_column("app_user", "avatar_ref", schema=schema)
    op.drop_column("app_user", "avatar_key", schema=schema)
