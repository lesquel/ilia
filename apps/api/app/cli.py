"""Explicit operator commands for one-time administrative provisioning."""

import argparse
import asyncio
import sys
from datetime import UTC, datetime

import structlog

from app.core.config import Settings, get_settings
from app.core.database import Database
from app.features.admin.domain.entities import AuditAction, AuditEntry
from app.features.admin.infrastructure.sql_repository import SqlAlchemyAuditLog
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.infrastructure.security import Argon2PasswordHasher
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository

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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="ilia", description="ILIA operator commands")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser(
        "create-admin",
        help="Create the first administrator from bootstrap environment settings.",
    )

    arguments = parser.parse_args(argv)
    if arguments.command == "create-admin":
        return asyncio.run(_create_admin(get_settings()))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
