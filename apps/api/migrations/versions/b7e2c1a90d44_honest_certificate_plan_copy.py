"""Stop promising a downloadable certificate on plan rows.

Older demo seeds stored “certificado descargable” on the Completo plan.
The first charla issues a code plus public verify; there is no PDF.

Revision ID: b7e2c1a90d44
Revises: 72bb92f069ad
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7e2c1a90d44"
down_revision: str | Sequence[str] | None = "72bb92f069ad"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

HONEST_PRO = (
    "Todas las rutas, cupo amplio de evaluaciones, certificado con código "
    "de verificación y participación en el foro."
)


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE plan
               SET description = :description
             WHERE description ILIKE '%descargable%'
            """
        ),
        {"description": HONEST_PRO},
    )


def downgrade() -> None:
    # Copy honesty is not reversible without guessing the previous sentence.
    return
