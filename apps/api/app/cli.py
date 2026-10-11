"""Explicit operator commands for one-time administrative provisioning."""

import argparse
import asyncio
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

import structlog

from app.core.config import Settings, get_settings
from app.core.database import Database
from app.features.admin.domain.entities import AuditAction, AuditEntry
from app.features.admin.infrastructure.sql_repository import SqlAlchemyAuditLog
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.infrastructure.security import Argon2PasswordHasher
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.evaluation.infrastructure.models import (
    EvaluationModel,
    EvaluationScoreModel,
    ModelOutputModel,
    SubmissionModel,
)

logger = structlog.get_logger()


async def _create_admin(settings: Settings) -> int:
    """Create the first administrator from explicitly supplied environment values."""
    if settings.is_production:
        print("create-admin is disabled in production.", file=sys.stderr)
        return 1

    values = {
        "ILIA_BOOTSTRAP_ADMIN_EMAIL": settings.bootstrap_admin_email,
        "ILIA_BOOTSTRAP_ADMIN_NAME": settings.bootstrap_admin_name,
        "ILIA_BOOTSTRAP_ADMIN_PASSWORD": settings.bootstrap_admin_password,
    }
    missing = [name for name, value in values.items() if not value or not value.strip()]
    if missing:
        print(f"Missing required settings: {', '.join(missing)}.", file=sys.stderr)
        return 2

    if settings.database_url is None:
        print("ILIA_DATABASE_URL is not set.", file=sys.stderr)
        return 2

    try:
        email = Email(settings.bootstrap_admin_email)
    except ValueError:
        print("ILIA_BOOTSTRAP_ADMIN_EMAIL is not a valid address.", file=sys.stderr)
        return 2

    database = Database(settings)
    try:
        users = SqlAlchemyUserRepository(database)
        existing = await users.get_by_email(email)
        existing_admins = await _count_admins(database)

        if existing is not None and existing.role is Role.ADMIN:
            print(f"{email} is already the bootstrap administrator. Nothing to do.")
            return 0

        if existing_admins > 0:
            print(
                f"There are already {existing_admins} administrators; "
                "refusing to provision another.",
                file=sys.stderr,
            )
            return 1

        if existing is not None:
            print(
                f"An account already exists for {email}; refusing to replace it.",
                file=sys.stderr,
            )
            return 1

        user = User.register(
            email=email,
            full_name=settings.bootstrap_admin_name,
            password_hash=Argon2PasswordHasher().hash(settings.bootstrap_admin_password),
            role=Role.ADMIN,
        )
        await users.add(user)

        audit = SqlAlchemyAuditLog(database)
        await audit.append(
            AuditEntry.record(
                actor_id=user.id,
                actor_name=f"{user.full_name} (bootstrap)",
                action=AuditAction.ROLE_CHANGED,
                target_type="user",
                target_id=user.id,
                detail={
                    "email": str(user.email),
                    "from": None,
                    "to": Role.ADMIN.value,
                    "reason": "bootstrap: first administrator",
                },
                at=datetime.now(UTC),
            )
        )

        print(f"{email} is now the first administrator.")
        return 0
    finally:
        await database.dispose()


async def _count_admins(database: Database) -> int:
    from sqlalchemy import func, select

    from app.features.auth.infrastructure.models import UserModel

    async with database.session() as session:
        result = await session.execute(
            select(func.count(UserModel.id)).where(UserModel.role == Role.ADMIN.value)
        )
        return int(result.scalar_one())


async def _purge_submission_content(settings: Settings, *, apply: bool) -> int:
    """Preview or purge student-identifying evaluation text older than 365 days."""
    if settings.database_url is None:
        print("ILIA_DATABASE_URL is not set.", file=sys.stderr)
        return 2
    cutoff = datetime.now(UTC) - timedelta(days=365)
    database = Database(settings)
    try:
        async with database.session() as session:
            result = await session.execute(
                select(SubmissionModel.id).where(
                    SubmissionModel.status.in_(["scored", "failed"]),
                    SubmissionModel.created_at < cutoff,
                    SubmissionModel.content_purged_at.is_(None),
                )
            )
            ids = list(result.scalars())
            print(f"Submissions elegibles: {len(ids)} (más antiguas que {cutoff.date()}).")
            if not apply or not ids:
                print("Vista previa; usa --apply para ejecutar el borrado.")
                return 0

            await session.execute(update(SubmissionModel).where(SubmissionModel.id.in_(ids)).values(prompt="", content_purged_at=datetime.now(UTC)))
            await session.execute(update(ModelOutputModel).where(ModelOutputModel.submission_id.in_(ids)).values(text=""))
            eval_ids = select(EvaluationModel.id).where(EvaluationModel.submission_id.in_(ids))
            await session.execute(update(EvaluationModel).where(EvaluationModel.submission_id.in_(ids)).values(feedback="", suggestion="", check_failures=[], override_reason=None))
            await session.execute(update(EvaluationScoreModel).where(EvaluationScoreModel.evaluation_id.in_(eval_ids)).values(justification=""))
            # Keep actor, timestamp, action and score transition; redact only free-text reason.
            from app.features.admin.infrastructure.models import AuditLogModel
            rows = await session.execute(select(AuditLogModel).where(AuditLogModel.action == "score_overridden"))
            for row in rows.scalars():
                if row.detail.get("submission_id") in {str(item) for item in ids} and "reason" in row.detail:
                    row.detail = {key: value for key, value in row.detail.items() if key != "reason"}
            print(f"Contenido purgado: {len(ids)} entregas.")
            return 0
    finally:
        await database.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="ilia", description="ILIA operator commands")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser(
        "create-admin",
        help="Create the first administrator from bootstrap environment settings.",
    )
    purge = subcommands.add_parser("purge-submission-content", help="Purgar contenido sensible con retención de 365 días.")
    purge.add_argument("--apply", action="store_true", help="Ejecutar el borrado; sin esta opción solo muestra una vista previa.")

    arguments = parser.parse_args(argv)
    if arguments.command == "create-admin":
        return asyncio.run(_create_admin(get_settings()))
    if arguments.command == "purge-submission-content":
        return asyncio.run(_purge_submission_content(get_settings(), apply=arguments.apply))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
