"""Certificate use cases."""

from uuid import UUID

from app.features.admin.domain.entities import AuditAction, AuditEntry
from app.features.admin.domain.ports import AuditLog
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import Clock, UserRepository
from app.features.catalog.domain.entities import Course, Slug
from app.features.catalog.domain.errors import CourseNotFoundError
from app.features.catalog.domain.ports import CourseRepository
from app.features.certificates.domain.entities import (
    Certificate,
    CriteriaOutcome,
    VerificationCode,
    check_criteria,
)
from app.features.certificates.domain.errors import (
    AlreadyRevokedError,
    CertificateNotFoundError,
    CriteriaNotMetError,
)
from app.features.certificates.domain.ports import (
    ActivityResultsReader,
    CertificateRepository,
)
from app.features.enrollment.domain.entities import compute_progress
from app.features.enrollment.domain.errors import NotEnrolledError
from app.features.enrollment.domain.ports import EnrollmentRepository, ProgressRepository


async def _published_course(courses: CourseRepository, slug: str) -> Course:
    try:
        identifier = Slug(slug)
    except ValueError as exc:
        raise CourseNotFoundError(slug) from exc

    course = await courses.get_published_by_slug(identifier)
    if course is None:
        raise CourseNotFoundError(slug)

    return course


class CheckEligibility:
    """Whether a teacher has earned a course yet, and what is missing."""

    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
        results: ActivityResultsReader,
    ) -> None:
        self._courses = courses
        self._enrollments = enrollments
        self._progress = progress
        self._results = results

    async def execute(self, *, user_id: UUID, slug: str) -> CriteriaOutcome:
        course = await _published_course(self._courses, slug)

        enrollment = await self._enrollments.get(user_id=user_id, course_id=course.id)
        if enrollment is None:
            raise NotEnrolledError()

        completed = await self._progress.completed_lesson_ids(enrollment.id)
        course_progress = compute_progress(course, completed)

        activities_total, activities_passed = await self._results.counts_for_course(
            user_id=user_id, course_id=course.id
        )

        return check_criteria(
            lessons_total=course_progress.total_lessons,
            lessons_completed=course_progress.completed_lessons,
            activities_total=activities_total,
            activities_passed=activities_passed,
        )


class IssueCertificate:
    def __init__(
        self,
        *,
        courses: CourseRepository,
        enrollments: EnrollmentRepository,
        progress: ProgressRepository,
        results: ActivityResultsReader,
        certificates: CertificateRepository,
        users: UserRepository,
        clock: Clock,
    ) -> None:
        self._eligibility = CheckEligibility(
            courses=courses, enrollments=enrollments, progress=progress, results=results
        )
        self._courses = courses
        self._certificates = certificates
        self._users = users
        self._clock = clock

    async def execute(self, *, user_id: UUID, slug: str) -> Certificate:
        course = await _published_course(self._courses, slug)

        # Idempotent: asking twice returns the certificate you already have,
        # rather than minting a second one with a different code. Two codes for
        # one achievement is two things to verify and one to explain.
        existing = await self._certificates.get_for_course(user_id=user_id, course_id=course.id)
        if existing is not None:
            return existing

        outcome = await self._eligibility.execute(user_id=user_id, slug=slug)
        if not outcome.met:
            raise CriteriaNotMetError(outcome.missing)

        user: User | None = await self._users.get_by_id(user_id)
        if user is None:
            raise CertificateNotFoundError()

        certificate = Certificate.issue(
            user_id=user_id,
            course_id=course.id,
            # The name is copied, not looked up at verification time. A
            # certificate states what was true when it was earned, and a
            # verification page that changes because someone edited their
            # profile is not a verification page.
            holder_name=user.full_name,
            course_title=course.title,
            issued_at=self._clock.now(),
        )
        await self._certificates.add(certificate)

        return certificate


class ListMyCertificates:
    def __init__(self, *, certificates: CertificateRepository) -> None:
        self._certificates = certificates

    async def execute(self, *, user_id: UUID) -> list[Certificate]:
        return await self._certificates.list_for_user(user_id)


class VerifyCertificate:
    """Public verification (PRD 8, no authentication).

    This is the endpoint that gives the certification credibility: anyone
    holding a code — a school, the Alcaldía, an employer — can check it without
    an account.
    """

    def __init__(self, *, certificates: CertificateRepository) -> None:
        self._certificates = certificates

    async def execute(self, *, raw_code: str) -> Certificate:
        try:
            code = VerificationCode(raw_code)
        except ValueError as exc:
            # A malformed code cannot match anything, so it is a miss — and it
            # answers exactly like a well-formed code that does not exist.
            raise CertificateNotFoundError() from exc

        certificate = await self._certificates.get_by_code(code)
        if certificate is None:
            raise CertificateNotFoundError()

        # A revoked certificate is returned, not hidden: the caller asked
        # whether it is valid, and "revoked" is the answer they need (PRD A-04).
        return certificate


class RevokeCertificate:
    """Admin-only (PRD A-04). Authorization is enforced in the interface layer.

    The revocation is written to the append-only audit log, not only to the
    application log. Invalidating someone's credential is exactly the kind of
    act that has to be answerable later — by an admin reading the log in the
    product, not by whoever still has access to the server's stdout.
    """

    def __init__(
        self, *, certificates: CertificateRepository, audit: AuditLog, clock: Clock
    ) -> None:
        self._certificates = certificates
        self._audit = audit
        self._clock = clock

    async def execute(
        self, *, certificate_id: UUID, admin: User, reason: str
    ) -> Certificate:
        certificate = await self._certificates.get(certificate_id)
        if certificate is None:
            raise CertificateNotFoundError()

        if not certificate.is_valid:
            raise AlreadyRevokedError()

        now = self._clock.now()
        certificate.revoke(by=admin.id, reason=reason, at=now)
        await self._certificates.update(certificate)

        await self._audit.append(
            AuditEntry.record(
                actor_id=admin.id,
                actor_name=admin.full_name,
                action=AuditAction.CERTIFICATE_REVOKED,
                target_type="certificate",
                target_id=certificate.id,
                detail={
                    "code": certificate.code.formatted,
                    "holder": certificate.holder_name,
                    "course": certificate.course_title,
                    "reason": reason,
                },
                at=now,
            )
        )

        return certificate
