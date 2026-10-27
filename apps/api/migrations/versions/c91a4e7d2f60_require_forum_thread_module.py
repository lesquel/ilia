"""Require every forum thread to belong to a module.

Revision ID: c91a4e7d2f60
Revises: a4f21b8c6d30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c91a4e7d2f60"
down_revision: str | Sequence[str] | None = "a4f21b8c6d30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    unscoped = int(
        bind.execute(
            sa.text("SELECT count(*) FROM community.forum_thread WHERE module_id IS NULL")
        ).scalar_one()
    )
    if unscoped:
        raise RuntimeError(
            f"Hay {unscoped} hilos sin módulo. Asígnalos a un módulo antes de actualizar el foro."
        )

    op.alter_column(
        "forum_thread",
        "module_id",
        schema="community",
        existing_type=sa.Uuid(),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "forum_thread",
        "module_id",
        schema="community",
        existing_type=sa.Uuid(),
        nullable=True,
    )
