"""Seed the default plans.

A freshly migrated database had no plans at all, which meant a new deployment
could not answer "what is this teacher allowed to do?" — the entitlements that
gate levels, certificates, forum posting and the evaluation quota all read from
this table.

**The numbers here are a starting point, not a decision.** PRD open question 4
leaves the free tier open, which is exactly why plans are rows and not
constants: an administrator changes them with an UPDATE, and nobody needs a
deploy to move a limit. What this migration guarantees is that the platform
works on day one rather than failing in a way that looks like a bug.

`price_cents` stays NULL for the paid plan on purpose. Showing a price nobody
agreed to is worse than showing none, and the UI says "Precio a definir".

Revision ID: a1c7f30d9b42
Revises: 11c4fa2a5fa3
"""

import json
from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "a1c7f30d9b42"
down_revision: str | Sequence[str] | None = "11c4fa2a5fa3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PLANS = [
    {
        "code": "free",
        "name": "Gratis",
        "description": "Para empezar: el itinerario básico, con cupo mensual de evaluaciones.",
        "monthly_evaluations": 10,
        "allowed_levels": ["beginner"],
        "can_issue_certificates": False,
        "can_post_in_forum": False,
        "price_cents": 0,
        "is_default": True,
    },
    {
        "code": "pro",
        "name": "Completo",
        "description": "Todos los niveles, certificados y participación en el foro.",
        "monthly_evaluations": 200,
        "allowed_levels": ["beginner", "intermediate", "expert"],
        "can_issue_certificates": True,
        "can_post_in_forum": True,
        # Undecided. NULL, not zero: zero means free, and this is not.
        "price_cents": None,
        "is_default": False,
    },
]


def upgrade() -> None:
    connection = op.get_bind()

    for plan in PLANS:
        # Idempotent by code. A database that already has these — every
        # environment running today — must not end up with duplicates, and a
        # migration that only works on an empty database is a migration that
        # fails exactly once, in production.
        existing = connection.execute(
            sa.text("SELECT 1 FROM plan WHERE code = :code"), {"code": plan["code"]}
        ).first()
        if existing is not None:
            continue

        connection.execute(
            sa.text("""
                INSERT INTO plan (
                    id, code, name, description, monthly_evaluations, allowed_levels,
                    can_issue_certificates, can_post_in_forum, price_cents, is_default
                ) VALUES (
                    :id, :code, :name, :description, :monthly_evaluations, :allowed_levels,
                    :can_issue_certificates, :can_post_in_forum, :price_cents, :is_default
                )
            """),
            {**plan, "id": uuid4(), "allowed_levels": json.dumps(plan["allowed_levels"])},
        )


def downgrade() -> None:
    # Only the rows this migration would have created, and only if nobody is on
    # them. Deleting a plan a teacher is subscribed to would leave that
    # subscription pointing at nothing.
    connection = op.get_bind()

    connection.execute(
        sa.text("""
            DELETE FROM plan
            WHERE code IN ('free', 'pro')
              AND id NOT IN (SELECT plan_id FROM subscription)
        """)
    )
