from typing import Protocol
from uuid import UUID

from app.features.certificates.domain.entities import Certificate, VerificationCode


class CertificateRepository(Protocol):
    async def add(self, certificate: Certificate) -> None: ...

    async def get_for_course(self, *, user_id: UUID, course_id: UUID) -> Certificate | None: ...

    async def get_by_code(self, code: VerificationCode) -> Certificate | None: ...

    async def get(self, certificate_id: UUID) -> Certificate | None: ...

    async def update(self, certificate: Certificate) -> None: ...

    async def list_for_user(self, user_id: UUID) -> list[Certificate]: ...


class ActivityResultsReader(Protocol):
    """How many evaluated activities a course has, and how many this teacher
    passed.

    A read port rather than a repository: the certificates feature needs the
    numbers, not the submissions, and reaching into another feature's tables
    for the full aggregate would tie the two together for no reason.
    """

    async def counts_for_course(self, *, user_id: UUID, course_id: UUID) -> tuple[int, int]: ...
