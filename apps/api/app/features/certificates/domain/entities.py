"""Certificates.

The end of the teacher's journey, and the part the Alcaldía will actually be
shown. Everything here is written so a certificate can be defended: how it was
earned, and how anyone can check it is real.
"""

import secrets
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

# Unambiguous alphabet: no O/0, no I/1/L. A code gets read aloud, written on a
# whiteboard and typed by someone who was not the one who received it.
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LENGTH = 12


class CertificateStatus(StrEnum):
    VALID = "valid"
    # Withdrawn by an admin (PRD A-04). The record stays: a certificate that
    # simply vanished would be indistinguishable from one that never existed,
    # and both the holder and whoever is checking deserve better.
    REVOKED = "revoked"


@dataclass(frozen=True)
class VerificationCode:
    """The public identifier of a certificate.

    Random, not sequential. A guessable code would let anyone enumerate every
    certificate the platform ever issued — and the whole point of public
    verification is that it reveals only what the holder chose to share.
    """

    value: str

    def __post_init__(self) -> None:
        normalized = self.value.strip().upper().replace("-", "")
        if len(normalized) != _CODE_LENGTH or any(char not in _ALPHABET for char in normalized):
            raise ValueError("Invalid verification code")
        object.__setattr__(self, "value", normalized)

    @classmethod
    def generate(cls) -> "VerificationCode":
        return cls("".join(secrets.choice(_ALPHABET) for _ in range(_CODE_LENGTH)))

    @property
    def formatted(self) -> str:
        """Grouped in fours, for reading and typing."""
        return "-".join(self.value[index : index + 4] for index in range(0, _CODE_LENGTH, 4))

    def __str__(self) -> str:
        return self.value


@dataclass
class Certificate:
    id: UUID
    user_id: UUID
    course_id: UUID
    code: VerificationCode
    holder_name: str
    course_title: str
    issued_at: datetime | None = None
    status: CertificateStatus = CertificateStatus.VALID
    revoked_at: datetime | None = None
    revoked_reason: str | None = None
    revoked_by: UUID | None = None

    @classmethod
    def issue(
        cls,
        *,
        user_id: UUID,
        course_id: UUID,
        holder_name: str,
        course_title: str,
        issued_at: datetime | None = None,
    ) -> "Certificate":
        return cls(
            id=uuid4(),
            user_id=user_id,
            course_id=course_id,
            code=VerificationCode.generate(),
            holder_name=holder_name.strip(),
            course_title=course_title.strip(),
            issued_at=issued_at,
        )

    @property
    def is_valid(self) -> bool:
        return self.status is CertificateStatus.VALID

    def revoke(self, *, by: UUID, reason: str, at: datetime | None = None) -> None:
        cleaned = reason.strip()
        if not cleaned:
            # Revoking a teacher's certificate without saying why is not
            # something the platform should make easy.
            raise ValueError("Revoking a certificate requires a reason")

        self.status = CertificateStatus.REVOKED
        self.revoked_by = by
        self.revoked_reason = cleaned
        self.revoked_at = at


@dataclass(frozen=True)
class CriteriaOutcome:
    """Whether a course has been earned, and what is missing if not.

    The reasons matter as much as the verdict: "todavía no" with no explanation
    is the single most frustrating thing a platform can tell someone who has
    been working.
    """

    lessons_total: int
    lessons_completed: int
    activities_total: int
    activities_passed: int
    missing: list[str] = field(default_factory=list)

    @property
    def met(self) -> bool:
        return not self.missing


def check_criteria(
    *,
    lessons_total: int,
    lessons_completed: int,
    activities_total: int,
    activities_passed: int,
) -> CriteriaOutcome:
    """The issuance criteria (PRD 10).

    **[A confirmar]** — the PRD leaves the exact threshold open. What is encoded
    here: every lesson completed, and every evaluated activity passed. Passing
    an activity already requires meeting its objective requirements, so a
    certificate cannot be reached through an inflated judge score alone.

    An empty course never qualifies. A syllabus still being written must not
    hand out certification for free — the same guard the progress rules make.
    """
    missing: list[str] = []

    if lessons_total == 0:
        missing.append("El curso todavía no tiene lecciones.")
    elif lessons_completed < lessons_total:
        pending = lessons_total - lessons_completed
        missing.append(
            f"Te faltan {pending} {'lección' if pending == 1 else 'lecciones'} por completar."
        )

    if activities_total and activities_passed < activities_total:
        pending = activities_total - activities_passed
        missing.append(
            f"Te falta aprobar {pending} "
            f"{'actividad' if pending == 1 else 'actividades'} del laboratorio."
        )

    return CriteriaOutcome(
        lessons_total=lessons_total,
        lessons_completed=lessons_completed,
        activities_total=activities_total,
        activities_passed=activities_passed,
        missing=missing,
    )
