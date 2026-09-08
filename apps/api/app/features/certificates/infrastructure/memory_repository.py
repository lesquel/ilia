"""In-memory certificate repositories, for fast tests and a database-less boot."""

from uuid import UUID

from app.features.certificates.domain.entities import Certificate, VerificationCode


class InMemoryCertificateRepository:
    def __init__(self, certificates: list[Certificate] | None = None) -> None:
        self._certificates = list(certificates or [])

    async def add(self, certificate: Certificate) -> None:
        self._certificates.append(certificate)

    async def get(self, certificate_id: UUID) -> Certificate | None:
        return next((item for item in self._certificates if item.id == certificate_id), None)

    async def get_for_course(self, *, user_id: UUID, course_id: UUID) -> Certificate | None:
        return next(
            (
                item
                for item in self._certificates
                if item.user_id == user_id and item.course_id == course_id
            ),
            None,
        )

    async def get_by_code(self, code: VerificationCode) -> Certificate | None:
        return next((item for item in self._certificates if item.code.value == code.value), None)

    async def update(self, certificate: Certificate) -> None:
        # The entity is held by reference, so a revoke() already applied. This
        # exists to satisfy the port, and to keep the SQL version honest about
        # needing an explicit write.
        return None

    async def list_for_user(self, user_id: UUID) -> list[Certificate]:
        return [item for item in self._certificates if item.user_id == user_id]


class StubActivityResults:
    """Fixed counts, for tests that are about certificates and not about the Lab."""

    def __init__(self, total: int = 0, passed: int = 0) -> None:
        self._total = total
        self._passed = passed

    async def counts_for_course(self, *, user_id: UUID, course_id: UUID) -> tuple[int, int]:
        return self._total, self._passed
