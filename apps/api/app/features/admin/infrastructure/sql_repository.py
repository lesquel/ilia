"""PostgreSQL implementations of the admin ports."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select

from app.core.config import Settings
from app.core.database import Database
from app.features.admin.domain.entities import AuditAction, AuditEntry, PlatformOverview
from app.features.auth.domain.entities import Email, Role, User
from app.features.auth.infrastructure.models import UserModel
from app.features.catalog.infrastructure.models import CourseModel
from app.features.certificates.infrastructure.models import CertificateModel
from app.features.enrollment.infrastructure.models import EnrollmentModel
from app.features.evaluation.infrastructure.models import LlmUsageModel, SubmissionModel

from .models import AuditLogModel


class SqlAlchemyMetricsReader:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def overview(self) -> PlatformOverview:
        async with self._db.session() as session:
            # Grouped counts rather than one query per number: this screen loads
            # every time an admin opens the dashboard.
            roles: dict[str, int] = {
                str(row[0]): int(row[1])
                for row in (
                    await session.execute(
                        select(UserModel.role, func.count(UserModel.id)).group_by(UserModel.role)
                    )
                ).all()
            }
            statuses: dict[str, int] = {
                str(row[0]): int(row[1])
                for row in (
                    await session.execute(
                        select(CourseModel.status, func.count(CourseModel.id)).group_by(
                            CourseModel.status
                        )
                    )
                ).all()
            }
            certificates: dict[str, int] = {
                str(row[0]): int(row[1])
                for row in (
                    await session.execute(
                        select(CertificateModel.status, func.count(CertificateModel.id)).group_by(
                            CertificateModel.status
                        )
                    )
                ).all()
            }
            enrollments = (
                await session.execute(select(func.count(EnrollmentModel.id)))
            ).scalar_one()
            submissions = (
                await session.execute(select(func.count(SubmissionModel.id)))
            ).scalar_one()

        return PlatformOverview(
            students=roles.get("student", 0),
            instructors=roles.get("instructor", 0),
            admins=roles.get("admin", 0),
            courses_published=statuses.get("published", 0),
            courses_draft=statuses.get("draft", 0),
            courses_archived=statuses.get("archived", 0),
            enrollments=int(enrollments),
            submissions=int(submissions),
            certificates_issued=certificates.get("valid", 0),
            certificates_revoked=certificates.get("revoked", 0),
        )

    async def usage_totals(self, *, since: datetime | None = None) -> tuple[int, int, int]:
        statement = select(
            func.coalesce(func.sum(LlmUsageModel.input_tokens), 0),
            func.coalesce(func.sum(LlmUsageModel.output_tokens), 0),
            func.count(LlmUsageModel.id),
        )

        if since is not None:
            statement = statement.where(LlmUsageModel.occurred_at >= since)

        async with self._db.session() as session:
            row = (await session.execute(statement)).one()

        return int(row[0]), int(row[1]), int(row[2])

    async def usage_by_user(
        self, *, since: datetime | None = None, limit: int = 50
    ) -> list[tuple[UUID, str, str, int, int, int]]:
        total_tokens = func.coalesce(func.sum(LlmUsageModel.input_tokens), 0) + func.coalesce(
            func.sum(LlmUsageModel.output_tokens), 0
        )

        statement = (
            select(
                UserModel.id,
                UserModel.full_name,
                UserModel.email,
                func.coalesce(func.sum(LlmUsageModel.input_tokens), 0),
                func.coalesce(func.sum(LlmUsageModel.output_tokens), 0),
                func.count(LlmUsageModel.id),
            )
            .join(UserModel, UserModel.id == LlmUsageModel.user_id)
            .group_by(UserModel.id, UserModel.full_name, UserModel.email)
            # Heaviest first: the point of this list is finding who costs most.
            .order_by(total_tokens.desc())
            .limit(limit)
        )

        if since is not None:
            statement = statement.where(LlmUsageModel.occurred_at >= since)

        async with self._db.session() as session:
            rows = (await session.execute(statement)).all()

        return [(row[0], row[1], row[2], int(row[3]), int(row[4]), int(row[5])) for row in rows]


def _to_user(row: UserModel) -> User:
    return User(
        id=row.id,
        email=Email(row.email),
        full_name=row.full_name,
        password_hash=row.password_hash,
        role=Role(row.role),
        is_active=row.is_active,
        created_at=row.created_at,
    )


class SqlAlchemyUserDirectory:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def list_users(self, *, query: str | None = None, limit: int = 100) -> list[User]:
        statement = select(UserModel).order_by(UserModel.created_at.desc()).limit(limit)

        if query:
            pattern = f"%{query}%"
            statement = statement.where(
                or_(UserModel.full_name.ilike(pattern), UserModel.email.ilike(pattern))
            )

        async with self._db.session() as session:
            rows = (await session.execute(statement)).scalars().all()

        return [_to_user(row) for row in rows]

    async def count_admins(self) -> int:
        async with self._db.session() as session:
            result = await session.execute(
                select(func.count(UserModel.id)).where(UserModel.role == Role.ADMIN.value)
            )
            return int(result.scalar_one())

    async def set_role(self, *, user_id: UUID, role: Role) -> None:
        async with self._db.session() as session:
            row = await session.get(UserModel, user_id)
            if row is None:
                return
            row.role = role.value


class SqlAlchemyAuditLog:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def append(self, entry: AuditEntry) -> None:
        async with self._db.session() as session:
            session.add(
                AuditLogModel(
                    id=entry.id,
                    actor_id=entry.actor_id,
                    actor_name=entry.actor_name,
                    action=entry.action.value,
                    target_type=entry.target_type,
                    target_id=entry.target_id,
                    detail=dict(entry.detail),
                    occurred_at=entry.occurred_at,
                )
            )

    async def recent(self, limit: int = 100) -> list[AuditEntry]:
        async with self._db.session() as session:
            rows = (
                (
                    await session.execute(
                        select(AuditLogModel)
                        .order_by(AuditLogModel.occurred_at.desc())
                        .limit(limit)
                    )
                )
                .scalars()
                .all()
            )

        return [
            AuditEntry(
                id=row.id,
                actor_id=row.actor_id or row.id,
                actor_name=row.actor_name,
                action=AuditAction(row.action),
                target_type=row.target_type,
                target_id=row.target_id,
                detail=dict(row.detail or {}),
                occurred_at=row.occurred_at,
            )
            for row in rows
        ]


class SettingsPricing:
    """Token prices, from configuration.

    Zero by default and on purpose: the provider is not chosen yet (TRD 2.6),
    and a hard-coded price would make an invented cost report look
    authoritative.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def prices(self) -> tuple[float, float]:
        return (
            self._settings.llm_input_price_per_million,
            self._settings.llm_output_price_per_million,
        )
