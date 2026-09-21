"""PostgreSQL implementation of the certificate ports."""

from uuid import UUID

from sqlalchemy import func, select

from app.core.database import Database
from app.features.certificates.domain.entities import (
    SIMULATED_EVALUATION_MODEL,
    ActivityResultCounts,
    Certificate,
    CertificateStatus,
    VerificationCode,
)
from app.features.evaluation.infrastructure.models import (
    ActivityModel,
    EvaluationModel,
    SubmissionModel,
)

from .models import CertificateModel


def _to_entity(row: CertificateModel) -> Certificate:
    return Certificate(
        id=row.id,
        user_id=row.user_id,
        course_id=row.course_id,
        code=VerificationCode(row.code),
        holder_name=row.holder_name,
        course_title=row.course_title,
        issued_at=row.issued_at,
        status=CertificateStatus(row.status),
        revoked_at=row.revoked_at,
        revoked_reason=row.revoked_reason,
        revoked_by=row.revoked_by,
    )


class SqlAlchemyCertificateRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def add(self, certificate: Certificate) -> None:
        async with self._db.session() as session:
            session.add(
                CertificateModel(
                    id=certificate.id,
                    user_id=certificate.user_id,
                    course_id=certificate.course_id,
                    code=certificate.code.value,
                    holder_name=certificate.holder_name,
                    course_title=certificate.course_title,
                    issued_at=certificate.issued_at,
                    status=certificate.status.value,
                )
            )

    async def get(self, certificate_id: UUID) -> Certificate | None:
        async with self._db.session() as session:
            row = await session.get(CertificateModel, certificate_id)
            return _to_entity(row) if row else None

    async def get_for_course(self, *, user_id: UUID, course_id: UUID) -> Certificate | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(CertificateModel).where(
                    CertificateModel.user_id == user_id,
                    CertificateModel.course_id == course_id,
                )
            )
            row = result.scalar_one_or_none()
            return _to_entity(row) if row else None

    async def get_by_code(self, code: VerificationCode) -> Certificate | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(CertificateModel).where(CertificateModel.code == code.value)
            )
            row = result.scalar_one_or_none()
            return _to_entity(row) if row else None

    async def update(self, certificate: Certificate) -> None:
        async with self._db.session() as session:
            row = await session.get(CertificateModel, certificate.id)
            if row is None:
                return
            row.status = certificate.status.value
            row.revoked_at = certificate.revoked_at
            row.revoked_reason = certificate.revoked_reason
            row.revoked_by = certificate.revoked_by

    async def list_for_user(self, user_id: UUID) -> list[Certificate]:
        async with self._db.session() as session:
            result = await session.execute(
                select(CertificateModel)
                .where(CertificateModel.user_id == user_id)
                .order_by(CertificateModel.issued_at.desc())
            )
            return [_to_entity(row) for row in result.scalars()]


class SqlActivityResultsReader:
    """How many evaluated activities a course has, and how many were passed.

    Two aggregates rather than loading submissions: the certificates feature
    needs counts, not the teacher's whole history.
    """

    def __init__(self, database: Database) -> None:
        self._db = database

    async def counts_for_course(self, *, user_id: UUID, course_id: UUID) -> ActivityResultCounts:
        async with self._db.session() as session:
            total = await session.execute(
                select(func.count(ActivityModel.id)).where(ActivityModel.course_id == course_id)
            )

            # An activity counts as passed if ANY real-model attempt passed — a
            # teacher who failed twice and got it right on the third try has
            # learned it, which is the whole point of allowing retries. The
            # local stub is not a real model: those notes must not mint a
            # certificate.
            real_pass = (
                SubmissionModel.user_id == user_id,
                ActivityModel.course_id == course_id,
                EvaluationModel.passed.is_(True),
                EvaluationModel.model != SIMULATED_EVALUATION_MODEL,
            )
            passed = await session.execute(
                select(func.count(func.distinct(SubmissionModel.activity_id)))
                .select_from(SubmissionModel)
                .join(EvaluationModel, EvaluationModel.submission_id == SubmissionModel.id)
                .join(ActivityModel, ActivityModel.id == SubmissionModel.activity_id)
                .where(*real_pass)
            )

            real_passed_ids = (
                select(SubmissionModel.activity_id)
                .select_from(SubmissionModel)
                .join(EvaluationModel, EvaluationModel.submission_id == SubmissionModel.id)
                .join(ActivityModel, ActivityModel.id == SubmissionModel.activity_id)
                .where(*real_pass)
            )
            simulated = await session.execute(
                select(func.count(func.distinct(SubmissionModel.activity_id)))
                .select_from(SubmissionModel)
                .join(EvaluationModel, EvaluationModel.submission_id == SubmissionModel.id)
                .join(ActivityModel, ActivityModel.id == SubmissionModel.activity_id)
                .where(
                    SubmissionModel.user_id == user_id,
                    ActivityModel.course_id == course_id,
                    EvaluationModel.passed.is_(True),
                    EvaluationModel.model == SIMULATED_EVALUATION_MODEL,
                    SubmissionModel.activity_id.not_in(real_passed_ids),
                )
            )

            return ActivityResultCounts(
                total=int(total.scalar_one()),
                passed=int(passed.scalar_one()),
                simulated_passed=int(simulated.scalar_one()),
            )
