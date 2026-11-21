"""Move app users out of the auth schema.

Supabase reserves `auth` for its own tables. ILIA's accounts live in `identity`.

Revision ID: c8f1a2b34d50
Revises: 3d9a6b1e7c20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8f1a2b34d50"
down_revision: str | Sequence[str] | None = "3d9a6b1e7c20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(sa.text("CREATE SCHEMA IF NOT EXISTS identity"))
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT to_regclass('auth.app_user')")).scalar():
        op.execute(sa.text("ALTER TABLE auth.app_user SET SCHEMA identity"))
    if bind.execute(sa.text("SELECT to_regclass('auth.password_reset_token')")).scalar():
        op.execute(sa.text("ALTER TABLE auth.password_reset_token SET SCHEMA identity"))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT to_regclass('identity.password_reset_token')")).scalar():
        op.execute(sa.text("ALTER TABLE identity.password_reset_token SET SCHEMA auth"))
    if bind.execute(sa.text("SELECT to_regclass('identity.app_user')")).scalar():
        op.execute(sa.text("ALTER TABLE identity.app_user SET SCHEMA auth"))
