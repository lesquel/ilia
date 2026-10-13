"""Move ILIA tables into domain schemas and enforce cross-course integrity.

Revision ID: 3d9a6b1e7c20
Revises: c4a8e2f91b03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3d9a6b1e7c20"
down_revision: str | Sequence[str] | None = "c4a8e2f91b03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = {
    "auth": ("app_user", "password_reset_token"),
    "catalog": ("course", "course_module", "lesson"),
    "learning": ("cohort", "enrollment", "lesson_progress", "certificate"),
    "assessment": (
        "rubric",
        "rubric_dimension",
        "activity",
        "submission",
        "model_output",
        "evaluation",
        "evaluation_score",
    ),
    "billing": ("plan", "subscription", "llm_usage"),
    "community": ("forum_thread", "forum_post"),
    "audit": ("audit_log",),
}


def _assert_no_mismatches() -> None:
    checks = {
        "lesson/module course mismatch": """SELECT count(*) FROM catalog.lesson l
          JOIN catalog.course_module m ON m.id=l.module_id WHERE l.course_id <> m.course_id""",
        "activity/module course mismatch": """SELECT count(*) FROM assessment.activity a
          JOIN catalog.course_module m ON m.id=a.module_id WHERE a.course_id <> m.course_id""",
        "forum module/course mismatch": """SELECT count(*) FROM community.forum_thread f
          JOIN catalog.course_module m ON m.id=f.module_id WHERE f.course_id <> m.course_id""",
        "progress enrollment/lesson course mismatch": """SELECT count(*) FROM learning.lesson_progress p
          JOIN learning.enrollment e ON e.id=p.enrollment_id
          JOIN catalog.lesson l ON l.id=p.lesson_id WHERE e.course_id <> l.course_id""",
    }
    bind = op.get_bind()
    issues = [(name, int(bind.execute(sa.text(sql)).scalar_one())) for name, sql in checks.items()]
    issues = [(name, count) for name, count in issues if count]
    if issues:
        detail = "; ".join(f"{name}: {count} filas" for name, count in issues)
        raise RuntimeError("No se aplican FKs compuestas: hay relaciones incoherentes. " + detail)


def upgrade() -> None:
    for schema in TABLES:
        op.execute(sa.schema.CreateSchema(schema, if_not_exists=True))
    for schema, tables in TABLES.items():
        for table in tables:
            op.execute(sa.text(f'ALTER TABLE public."{table}" SET SCHEMA "{schema}"'))

    bind = op.get_bind()
    # `cohort_id` already exists on enrollment and represents the talk that
    # led to that specific enrollment. Preserve it; copy the older user-level
    # value only where the enrollment has no attribution yet.
    bind.execute(
        sa.text("""UPDATE learning.enrollment e SET cohort_id=u.cohort_id
      FROM auth.app_user u WHERE e.user_id=u.id AND e.cohort_id IS NULL
        AND u.cohort_id IS NOT NULL""")
    )
    op.drop_constraint("app_user_cohort_id_fkey", "app_user", schema="auth", type_="foreignkey")
    op.drop_column("app_user", "cohort_id", schema="auth")

    op.add_column("lesson", sa.Column("course_id", sa.Uuid(), nullable=True), schema="catalog")
    bind.execute(
        sa.text("""UPDATE catalog.lesson l SET course_id=m.course_id
        FROM catalog.course_module m WHERE l.module_id=m.id""")
    )
    missing_course = int(
        bind.execute(
            sa.text("SELECT count(*) FROM catalog.lesson WHERE course_id IS NULL")
        ).scalar_one()
    )
    if missing_course:
        raise RuntimeError(
            f"Hay {missing_course} lecciones sin módulo válido; no se añadió course_id."
        )
    op.alter_column("lesson", "course_id", schema="catalog", nullable=False)
    op.create_unique_constraint(
        "uq_course_module_id_course", "course_module", ["id", "course_id"], schema="catalog"
    )
    op.create_unique_constraint(
        "uq_lesson_id_course", "lesson", ["id", "course_id"], schema="catalog"
    )
    op.create_unique_constraint(
        "uq_enrollment_id_course", "enrollment", ["id", "course_id"], schema="learning"
    )

    # Replace single-column FKs with constraints that also bind the course id.
    for table, name, schema in (
        ("lesson", "lesson_module_id_fkey", "catalog"),
        ("activity", "activity_module_id_fkey", "assessment"),
    ):
        op.drop_constraint(name, table, schema=schema, type_="foreignkey")
    op.create_foreign_key(
        "fk_lesson_module_course",
        "lesson",
        "course_module",
        ["module_id", "course_id"],
        ["id", "course_id"],
        source_schema="catalog",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_activity_module_course",
        "activity",
        "course_module",
        ["module_id", "course_id"],
        ["id", "course_id"],
        source_schema="assessment",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    op.drop_constraint(
        "forum_thread_module_id_fkey", "forum_thread", schema="community", type_="foreignkey"
    )
    bind.execute(
        sa.text("""CREATE TEMP TABLE _bad_forum_course AS SELECT f.id
      FROM community.forum_thread f JOIN catalog.course_module m ON m.id=f.module_id
      WHERE f.course_id <> m.course_id""")
    )
    forum_mismatch = int(
        bind.execute(sa.text("SELECT count(*) FROM _bad_forum_course")).scalar_one()
    )
    if forum_mismatch:
        raise RuntimeError(f"Hay {forum_mismatch} hilos con curso y módulo incompatibles.")
    op.create_foreign_key(
        "fk_forum_thread_module_course",
        "forum_thread",
        "course_module",
        ["module_id", "course_id"],
        ["id", "course_id"],
        source_schema="community",
        referent_schema="catalog",
        ondelete="CASCADE",
    )

    # Existing single-column FKs retain their meaning with schema-qualified
    # targets; PostgreSQL updates their target OIDs during SET SCHEMA.

    op.add_column(
        "lesson_progress", sa.Column("course_id", sa.Uuid(), nullable=True), schema="learning"
    )
    bind.execute(
        sa.text("""UPDATE learning.lesson_progress p SET course_id=e.course_id
      FROM learning.enrollment e WHERE p.enrollment_id=e.id""")
    )
    missing_progress_course = int(
        bind.execute(
            sa.text("SELECT count(*) FROM learning.lesson_progress WHERE course_id IS NULL")
        ).scalar_one()
    )
    if missing_progress_course:
        raise RuntimeError(f"Hay {missing_progress_course} progresos sin matrícula válida.")
    _assert_no_mismatches()
    op.alter_column("lesson_progress", "course_id", schema="learning", nullable=False)
    op.drop_constraint(
        "lesson_progress_enrollment_id_fkey",
        "lesson_progress",
        schema="learning",
        type_="foreignkey",
    )
    op.drop_constraint(
        "lesson_progress_lesson_id_fkey", "lesson_progress", schema="learning", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_progress_enrollment_course",
        "lesson_progress",
        "enrollment",
        ["enrollment_id", "course_id"],
        ["id", "course_id"],
        source_schema="learning",
        referent_schema="learning",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_progress_lesson_course",
        "lesson_progress",
        "lesson",
        ["lesson_id", "course_id"],
        ["id", "course_id"],
        source_schema="learning",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    op.add_column(
        "lesson_progress",
        sa.Column("position_seconds", sa.Integer(), server_default="0", nullable=False),
        schema="learning",
    )
    op.add_column(
        "lesson_progress",
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        schema="learning",
    )
    op.alter_column("lesson_progress", "completed_at", schema="learning", nullable=True)
    op.create_check_constraint(
        "ck_lesson_progress_position_nonnegative",
        "lesson_progress",
        "position_seconds >= 0",
        schema="learning",
    )
    op.create_index(
        "ix_lesson_module_course", "lesson", ["module_id", "course_id"], schema="catalog"
    )
    op.create_index("ix_lesson_course_id", "lesson", ["course_id"], schema="catalog")
    op.create_index(
        "ix_activity_module_course", "activity", ["module_id", "course_id"], schema="assessment"
    )
    op.create_index(
        "ix_forum_thread_module_course",
        "forum_thread",
        ["module_id", "course_id"],
        schema="community",
    )
    op.create_index(
        "ix_progress_enrollment_course",
        "lesson_progress",
        ["enrollment_id", "course_id"],
        schema="learning",
    )
    op.create_index(
        "ix_progress_lesson_course",
        "lesson_progress",
        ["lesson_id", "course_id"],
        schema="learning",
    )
    op.create_index(
        "ix_lesson_progress_course_id", "lesson_progress", ["course_id"], schema="learning"
    )
    op.create_check_constraint(
        "ck_activity_max_attempts_positive", "activity", "max_attempts > 0", schema="assessment"
    )
    op.create_check_constraint(
        "ck_submission_attempt_positive", "submission", "attempt > 0", schema="assessment"
    )

    op.add_column(
        "llm_usage",
        sa.Column("provider", sa.String(60), server_default="unknown", nullable=False),
        schema="billing",
    )
    op.add_column(
        "llm_usage",
        sa.Column("input_price_per_million", sa.Numeric(14, 6), nullable=True),
        schema="billing",
    )
    op.add_column(
        "llm_usage",
        sa.Column("output_price_per_million", sa.Numeric(14, 6), nullable=True),
        schema="billing",
    )
    op.add_column(
        "llm_usage", sa.Column("input_cost_usd", sa.Numeric(14, 8), nullable=True), schema="billing"
    )
    op.add_column(
        "llm_usage",
        sa.Column("output_cost_usd", sa.Numeric(14, 8), nullable=True),
        schema="billing",
    )
    op.add_column(
        "llm_usage", sa.Column("total_cost_usd", sa.Numeric(14, 8), nullable=True), schema="billing"
    )

    op.add_column(
        "subscription",
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        schema="billing",
    )
    op.drop_index("ix_subscription_user_id", table_name="subscription", schema="billing")
    op.create_index(
        "ix_subscription_user_id", "subscription", ["user_id"], unique=False, schema="billing"
    )
    op.create_index(
        "uq_subscription_active_user",
        "subscription",
        ["user_id"],
        unique=True,
        schema="billing",
        postgresql_where=sa.text("ended_at IS NULL"),
    )

    op.add_column(
        "submission",
        sa.Column("content_purged_at", sa.DateTime(timezone=True), nullable=True),
        schema="assessment",
    )


def downgrade() -> None:
    bind = op.get_bind()
    duplicate_history = int(
        bind.execute(
            sa.text("""SELECT count(*) FROM (
      SELECT user_id FROM billing.subscription GROUP BY user_id HAVING count(*) > 1
    ) s""")
        ).scalar_one()
    )
    if duplicate_history:
        raise RuntimeError(
            "No se puede volver a una sola suscripción por usuario: ya existe historial."
        )
    _assert_no_mismatches()

    op.drop_column("submission", "content_purged_at", schema="assessment")
    op.drop_constraint(
        "ck_submission_attempt_positive", "submission", schema="assessment", type_="check"
    )
    op.drop_constraint(
        "ck_activity_max_attempts_positive", "activity", schema="assessment", type_="check"
    )
    op.drop_index("uq_subscription_active_user", table_name="subscription", schema="billing")
    op.drop_index("ix_subscription_user_id", table_name="subscription", schema="billing")
    op.create_index(
        "ix_subscription_user_id", "subscription", ["user_id"], unique=True, schema="billing"
    )
    op.drop_column("subscription", "ended_at", schema="billing")
    for column in (
        "total_cost_usd",
        "output_cost_usd",
        "input_cost_usd",
        "output_price_per_million",
        "input_price_per_million",
        "provider",
    ):
        op.drop_column("llm_usage", column, schema="billing")

    for table, name, schema in (
        ("lesson", "fk_lesson_module_course", "catalog"),
        ("activity", "fk_activity_module_course", "assessment"),
        ("forum_thread", "fk_forum_thread_module_course", "community"),
        ("lesson_progress", "fk_progress_enrollment_course", "learning"),
        ("lesson_progress", "fk_progress_lesson_course", "learning"),
    ):
        op.drop_constraint(name, table, schema=schema, type_="foreignkey")
    op.create_foreign_key(
        "lesson_module_id_fkey",
        "lesson",
        "course_module",
        ["module_id"],
        ["id"],
        source_schema="catalog",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "activity_module_id_fkey",
        "activity",
        "course_module",
        ["module_id"],
        ["id"],
        source_schema="assessment",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "forum_thread_module_id_fkey",
        "forum_thread",
        "course_module",
        ["module_id"],
        ["id"],
        source_schema="community",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "lesson_progress_enrollment_id_fkey",
        "lesson_progress",
        "enrollment",
        ["enrollment_id"],
        ["id"],
        source_schema="learning",
        referent_schema="learning",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "lesson_progress_lesson_id_fkey",
        "lesson_progress",
        "lesson",
        ["lesson_id"],
        ["id"],
        source_schema="learning",
        referent_schema="catalog",
        ondelete="CASCADE",
    )
    for table, index, schema in (
        ("lesson", "ix_lesson_module_course", "catalog"),
        ("lesson", "ix_lesson_course_id", "catalog"),
        ("activity", "ix_activity_module_course", "assessment"),
        ("forum_thread", "ix_forum_thread_module_course", "community"),
        ("lesson_progress", "ix_progress_enrollment_course", "learning"),
        ("lesson_progress", "ix_progress_lesson_course", "learning"),
        ("lesson_progress", "ix_lesson_progress_course_id", "learning"),
    ):
        op.drop_index(index, table_name=table, schema=schema)
    op.drop_constraint(
        "ck_lesson_progress_position_nonnegative",
        "lesson_progress",
        schema="learning",
        type_="check",
    )
    op.drop_column("lesson_progress", "last_viewed_at", schema="learning")
    op.drop_column("lesson_progress", "position_seconds", schema="learning")
    op.alter_column("lesson_progress", "completed_at", schema="learning", nullable=False)
    op.drop_column("lesson_progress", "course_id", schema="learning")
    op.drop_constraint(
        "uq_course_module_id_course", "course_module", schema="catalog", type_="unique"
    )
    op.drop_constraint("uq_lesson_id_course", "lesson", schema="catalog", type_="unique")
    op.drop_constraint("uq_enrollment_id_course", "enrollment", schema="learning", type_="unique")
    op.drop_column("lesson", "course_id", schema="catalog")
    op.add_column("app_user", sa.Column("cohort_id", sa.Uuid(), nullable=True), schema="auth")
    bind.execute(
        sa.text("""UPDATE auth.app_user u SET cohort_id=e.cohort_id
      FROM learning.enrollment e WHERE e.user_id=u.id AND e.cohort_id IS NOT NULL""")
    )
    op.create_foreign_key(
        "app_user_cohort_id_fkey",
        "app_user",
        "cohort",
        ["cohort_id"],
        ["id"],
        source_schema="auth",
        referent_schema="learning",
        ondelete="SET NULL",
    )
    for schema, tables in reversed(list(TABLES.items())):
        for table in reversed(tables):
            op.execute(sa.text(f'ALTER TABLE "{schema}"."{table}" SET SCHEMA public'))
    for schema in reversed(list(TABLES)):
        op.execute(sa.schema.DropSchema(schema, cascade=True))
