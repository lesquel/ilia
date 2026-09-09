"""In-memory admin adapters, for tests and the no-database dev fallback."""

from app.features.admin.domain.entities import AuditEntry


class InMemoryAuditLog:
    """The audit log, without a database.

    It exists so that revoking a certificate is recorded on every
    configuration. If the no-database path simply had no audit log, the same
    action would be answerable in production and silent in development — and
    the difference would only show up the day someone asked who revoked what.
    """

    def __init__(self) -> None:
        # Append-only, like the table: entries go in and are never edited.
        self._entries: list[AuditEntry] = []

    async def append(self, entry: AuditEntry) -> None:
        self._entries.append(entry)

    async def recent(self, limit: int = 100) -> list[AuditEntry]:
        return list(reversed(self._entries))[:limit]
