"""PostgreSQL schemas that follow ILIA's data ownership boundaries."""

from enum import StrEnum


class DbSchema(StrEnum):
    AUTH = "identity"
    CATALOG = "catalog"
    LEARNING = "learning"
    ASSESSMENT = "assessment"
    BILLING = "billing"
    COMMUNITY = "community"
    AUDIT = "audit"


SCHEMA_TABLES: dict[DbSchema, tuple[str, ...]] = {
    DbSchema.AUTH: ("app_user", "password_reset_token"),
    DbSchema.CATALOG: ("course", "course_module", "lesson"),
    DbSchema.LEARNING: ("cohort", "enrollment", "lesson_progress", "certificate"),
    DbSchema.ASSESSMENT: (
        "rubric",
        "rubric_dimension",
        "activity",
        "submission",
        "model_output",
        "evaluation",
        "evaluation_score",
    ),
    DbSchema.BILLING: ("plan", "subscription", "llm_usage"),
    DbSchema.COMMUNITY: ("forum_thread", "forum_post"),
    DbSchema.AUDIT: ("audit_log",),
}
