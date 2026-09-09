"""Operator commands.

Right now there is exactly one, and it exists to break a deadlock: roles are
granted and never claimed (PRD A-02), so a fresh deployment has nobody who can
grant them. No admin means no instructors, which means no courses, ever. The
platform would be permanently frozen the moment it was deployed.

**Why a command and not an environment variable.** A variable that promotes on
every boot is one typo away from making the wrong person an administrator, over
and over, silently. This runs when an operator decides it runs, writes to the
audit log, and refuses to be a way of quietly granting more admins later.
"""

import argparse
import asyncio
import sys
from datetime import UTC, datetime

import structlog

from app.core.config import Settings, get_settings
from app.core.database import Database
from app.features.admin.domain.entities import AuditAction, AuditEntry
from app.features.admin.infrastructure.sql_repository import SqlAlchemyAuditLog
from app.features.auth.domain.entities import Email, Role
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository

logger = structlog.get_logger()


async def _promote(settings: Settings, email: str) -> int:
    if settings.database_url is None:
        print("ILIA_DATABASE_URL is not set.", file=sys.stderr)
        return 2

    database = Database(settings)
    try:
        users = SqlAlchemyUserRepository(database)

        try:
            address = Email(email)
        except ValueError:
            print(f"{email!r} is not a valid address.", file=sys.stderr)
            return 2

        user = await users.get_by_email(address)
        if user is None:
            # The account must exist first. Creating one here would mean setting
            # a password on the command line, where it lands in shell history.
            print(
                f"No account for {email}. Register through the app first, then run this again.",
                file=sys.stderr,
            )
            return 1

        if user.role is Role.ADMIN:
            print(f"{email} is already an administrator. Nothing to do.")
            return 0

        # Refuses once an administrator exists. After that, promotion belongs in
        # the product — where it is audited, reversible, and done by someone who
        # is accountable. A shell command that keeps working is a permanent side
        # door that bypasses all of that.
        audit = SqlAlchemyAuditLog(database)
        existing_admins = await _count_admins(database)
        if existing_admins > 0:
            print(
                f"There are already {existing_admins} administrators. "
                "Grant the role from the admin screen, where it is audited.",
                file=sys.stderr,
            )
            return 1

        previous = user.role
        user.role = Role.ADMIN
        await users.update(user)

        await audit.append(
            AuditEntry.record(
                actor_id=user.id,
                actor_name=f"{user.full_name} (bootstrap)",
                action=AuditAction.ROLE_CHANGED,
                target_type="user",
                target_id=user.id,
                detail={
                    "email": str(user.email),
                    "from": previous.value,
                    "to": Role.ADMIN.value,
                    # Marked, so the one grant nobody approved is identifiable
                    # in the log for as long as the log exists.
                    "reason": "bootstrap: first administrator",
                },
                at=datetime.now(UTC),
            )
        )

        print(f"{email} is now an administrator.")
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

    bootstrap = subcommands.add_parser(
        "bootstrap-admin",
        help="Promote an existing account to administrator. Only while there are none.",
    )
    bootstrap.add_argument("email")

    arguments = parser.parse_args(argv)

    if arguments.command == "bootstrap-admin":
        return asyncio.run(_promote(get_settings(), arguments.email))

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
