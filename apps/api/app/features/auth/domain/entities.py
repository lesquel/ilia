"""Auth domain entities.

Pure Python. No ORM, no framework, no SDK — the rule that makes this Clean
Architecture and not a folder-naming convention.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4


class Role(StrEnum):
    """The three roles of the platform (PRD 5).

    Permissions accumulate upward: an instructor can do everything a student
    can, an admin everything an instructor can.

    Note the naming trap the PRD flags: the schoolteacher being trained is a
    STUDENT here. INSTRUCTOR is whoever teaches *on* the platform.
    """

    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"

    @property
    def rank(self) -> int:
        return _ROLE_RANK[self]

    def can_act_as(self, other: "Role") -> bool:
        return self.rank >= other.rank


_ROLE_RANK: dict[Role, int] = {
    Role.STUDENT: 0,
    Role.INSTRUCTOR: 1,
    Role.ADMIN: 2,
}


@dataclass(frozen=True)
class Email:
    """Normalized email.

    Normalization lives in the domain rather than in a Pydantic schema because
    "the same user" is a domain question: `Ana@colegio.edu` and
    `ana@colegio.edu` must not become two accounts.
    """

    value: str

    def __post_init__(self) -> None:
        normalized = self.value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("Email must contain '@'")
        object.__setattr__(self, "value", normalized)

    def __str__(self) -> str:
        return self.value


@dataclass
class User:
    id: UUID
    email: Email
    full_name: str
    password_hash: str
    role: Role
    is_active: bool = True
    created_at: datetime | None = None
    roles_history: list[Role] = field(default_factory=list)
    # Bumped whenever every existing session must stop working. Refresh tokens
    # carry the generation they were issued under, and `RefreshSession` already
    # re-reads the user — so ending other sessions costs one integer comparison
    # against a row it was reading anyway, and no denylist to keep.
    token_generation: int = 0

    def change_password(self, password_hash: str) -> None:
        """Set a new password and end every other session.

        The bump is the point. Someone changing their password because they
        think another person has it would otherwise leave that person signed
        in — a password change that does not evict the intruder is theatre.
        """
        self.password_hash = password_hash
        self.token_generation += 1

    @classmethod
    def register(
        cls,
        *,
        email: Email,
        full_name: str,
        password_hash: str,
        role: Role = Role.STUDENT,
        created_at: datetime | None = None,
    ) -> "User":
        """A new account. Everyone starts as a student — an instructor or admin
        is made by an explicit, audited role change, never by self-registration
        (PRD A-02)."""
        name = full_name.strip()
        if not name:
            raise ValueError("Full name cannot be empty")

        return cls(
            id=uuid4(),
            email=email,
            full_name=name,
            password_hash=password_hash,
            role=role,
            created_at=created_at,
        )

    def has_at_least(self, role: Role) -> bool:
        return self.role.can_act_as(role)


@dataclass
class PasswordResetToken:
    """One recover-password credential. Only the hash is persisted."""

    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    used_at: datetime | None = None
    created_at: datetime | None = None

    def is_usable(self, *, at: datetime) -> bool:
        return self.used_at is None and self.expires_at > at
