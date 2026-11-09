"""merge identity schema and forum cohort branches

Revision ID: 9021ee13c234
Revises: c8f1a2b34d50, c92b5a1e7f34
Create Date: 2026-11-09 15:10:24.767998

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "9021ee13c234"
down_revision: str | Sequence[str] | None = ("c8f1a2b34d50", "c92b5a1e7f34")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
