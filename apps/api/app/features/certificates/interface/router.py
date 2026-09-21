"""Certificate endpoints.

One of these is deliberately public. `GET /certificates/verify/{code}` takes no
authentication, because the whole value of the certification is that a school,
the Alcaldía or an employer can check it without an account (PRD 8).
"""

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from app.features.auth.domain.entities import Role, User
from app.features.auth.interface.dependencies import CurrentUser, require_role
from app.features.billing.application.use_cases import require_certificates
from app.features.billing.interface.dependencies import EntitlementsDep
from app.features.catalog.interface.router import CoursesDep
from app.features.certificates.application.use_cases import (
    CheckEligibility,
    IssueCertificate,
    ListMyCertificates,
    RevokeCertificate,
    VerifyCertificate,
)
from app.features.certificates.domain.entities import (
    Certificate,
    CriteriaOutcome,
    VerificationCode,
)
from app.features.certificates.domain.errors import CertificateNotFoundError
from app.features.certificates.interface.dependencies import (
    CertificatesDep,
    ResultsDep,
)
from app.features.enrollment.interface.dependencies import EnrollmentsDep, ProgressDep

router = APIRouter(prefix="/certificates", tags=["certificates"])
logger = structlog.get_logger()


class CertificateResponse(BaseModel):
    id: UUID
    code: str
    course_title: str
    holder_name: str
    issued_at: str | None
    status: str

    @classmethod
    def from_entity(cls, certificate: Certificate) -> "CertificateResponse":
        return cls(
            id=certificate.id,
            code=certificate.code.formatted,
            course_title=certificate.course_title,
            holder_name=certificate.holder_name,
            issued_at=certificate.issued_at.isoformat() if certificate.issued_at else None,
            status=certificate.status.value,
        )


class EligibilityResponse(BaseModel):
    met: bool
    lessons_total: int
    lessons_completed: int
    activities_total: int
    activities_passed: int
    missing: list[str]

    @classmethod
    def from_entity(cls, outcome: CriteriaOutcome) -> "EligibilityResponse":
        return cls(
            met=outcome.met,
            lessons_total=outcome.lessons_total,
            lessons_completed=outcome.lessons_completed,
            activities_total=outcome.activities_total,
            activities_passed=outcome.activities_passed,
            missing=outcome.missing,
        )


class VerificationResponse(BaseModel):
    """What a public verification reveals.

    Deliberately minimal: who earned it, what they earned, when, and whether it
    still stands. No email, no id, no progress. Verifying a certificate must not
    become a way to look someone up.
    """

    valid: bool
    status: str
    holder_name: str
    course_title: str
    issued_at: str | None
    revoked_reason: str | None


@router.get("/verify/{code}", response_model=VerificationResponse)
async def verify(code: str, certificates: CertificatesDep) -> VerificationResponse:
    """Public. No authentication, on purpose."""
    certificate = await VerifyCertificate(certificates=certificates).execute(raw_code=code)

    return VerificationResponse(
        valid=certificate.is_valid,
        status=certificate.status.value,
        holder_name=certificate.holder_name,
        course_title=certificate.course_title,
        issued_at=certificate.issued_at.isoformat() if certificate.issued_at else None,
        # Why it was revoked is part of the answer: "revoked" with no reason
        # invites the holder to be assumed guilty of something unspecified.
        revoked_reason=certificate.revoked_reason,
    )


@router.get("/me", response_model=list[CertificateResponse])
async def my_certificates(
    user: CurrentUser, certificates: CertificatesDep
) -> list[CertificateResponse]:
    issued = await ListMyCertificates(certificates=certificates).execute(user_id=user.id)
    return [CertificateResponse.from_entity(item) for item in issued]


@router.get("/eligibility/{slug}", response_model=EligibilityResponse)
async def eligibility(
    slug: str,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    progress: ProgressDep,
    results: ResultsDep,
) -> EligibilityResponse:
    outcome = await CheckEligibility(
        courses=courses, enrollments=enrollments, progress=progress, results=results
    ).execute(user_id=user.id, slug=slug)

    return EligibilityResponse.from_entity(outcome)


@router.post("/{slug}", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
async def issue(
    slug: str,
    request: Request,
    user: CurrentUser,
    courses: CoursesDep,
    enrollments: EnrollmentsDep,
    progress: ProgressDep,
    results: ResultsDep,
    certificates: CertificatesDep,
    entitlements: EntitlementsDep,
) -> CertificateResponse:
    # Issuing the verification code is a paid feature (PRD 11). Eligibility is
    # still computed and shown to everyone — a teacher who earned it should
    # know they earned it, even if their plan does not hand over the code.
    if entitlements is not None:
        require_certificates(entitlements)

    certificate = await IssueCertificate(
        courses=courses,
        enrollments=enrollments,
        progress=progress,
        results=results,
        certificates=certificates,
        users=request.app.state.auth["users"],
        clock=request.app.state.auth["clock"],
    ).execute(user_id=user.id, slug=slug)

    return CertificateResponse.from_entity(certificate)


class RevokeRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


@router.get("/lookup", response_model=CertificateResponse)
async def lookup(
    code: str,
    certificates: CertificatesDep,
    admin: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> CertificateResponse:
    """Find a certificate by its verification code. Admin only.

    Revocation needs an id, and until this existed there was no way to obtain
    one: the public verification endpoint deliberately omits it, and the
    per-user listing only shows your own. The revoke endpoint was therefore
    unreachable in practice.

    Admin-only rather than public because it answers with more than "is this
    valid" — and because an open lookup would hand an enumeration oracle to
    whoever wanted one.
    """
    try:
        parsed = VerificationCode(code)
    except ValueError as exc:
        # Same answer as a well-formed code that matches nothing: a malformed
        # one cannot match anything either.
        raise CertificateNotFoundError() from exc

    found = await certificates.get_by_code(parsed)
    if found is None:
        raise CertificateNotFoundError()

    return CertificateResponse.from_entity(found)


@router.post("/{certificate_id}/revoke", response_model=CertificateResponse)
async def revoke(
    certificate_id: UUID,
    payload: RevokeRequest,
    request: Request,
    certificates: CertificatesDep,
    admin: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> CertificateResponse:
    """Admin only (PRD A-04), and audited.

    A revoked certificate fails public verification from the next request on.
    """
    certificate = await RevokeCertificate(
        certificates=certificates,
        audit=request.app.state.admin["audit"],
        clock=request.app.state.auth["clock"],
    ).execute(certificate_id=certificate_id, admin=admin, reason=payload.reason)

    logger.info(
        "certificate_revoked",
        certificate_id=str(certificate_id),
        admin_id=str(admin.id),
    )

    return CertificateResponse.from_entity(certificate)
