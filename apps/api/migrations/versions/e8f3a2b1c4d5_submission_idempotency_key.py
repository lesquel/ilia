"""submission idempotency key

Revision ID: e8f3a2b1c4d5
Revises: b7e2c1a90d44
Create Date: 2026-09-21

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e8f3a2b1c4d5"
down_revision: str | Sequence[str] | None = "b7e2c1a90d44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Retries over flaky school Wi-Fi reuse the same key for ~24h; older rows are
# not looked up (application layer) so a teacher can start a fresh attempt later.
IDEMPOTENCY_KEY_MAX_LENGTH = 128


def upgrade() -> None:
    op.add_column(
        "submission",
        sa.Column("idempotency_key", sa.String(IDEMPOTENCY_KEY_MAX_LENGTH), nullable=True),
    )
    op.create_index(
        "uq_submission_idempotency",
        "submission",
        ["user_id", "activity_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_submission_idempotency", table_name="submission")
    op.drop_column("submission", "idempotency_key")
