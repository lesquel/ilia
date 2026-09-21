from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.features.auth.application.use_cases import Session
from app.features.auth.domain.entities import User


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    # 8 is a floor, not a policy. Length beats composition rules, which mostly
    # teach people to write "Password1!" and reuse it everywhere.
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    # The same floor as registration, deliberately repeated rather than shared:
    # these are two different decisions that happen to agree today.
    new_password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetIssueRequest(BaseModel):
    email: str


class PasswordResetConfirmRequest(BaseModel):
    reset_token: str = Field(min_length=16, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetIssueResponse(BaseModel):
    reset_token: str
    expires_at: datetime


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str

    @classmethod
    def from_entity(cls, user: User) -> "UserResponse":
        return cls(
            id=user.id,
            email=str(user.email),
            full_name=user.full_name,
            role=user.role.value,
        )


class SessionResponse(BaseModel):
    """What a successful login returns.

    The tokens are populated **only for native clients**. A web client gets them
    as httpOnly cookies and these fields stay `None`, because a token the web
    page can read is a token an injected script can steal.
    """

    user: UserResponse
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None

    @classmethod
    def for_native(cls, session: Session) -> "SessionResponse":
        return cls(
            user=UserResponse.from_entity(session.user),
            access_token=session.tokens.access_token,
            refresh_token=session.tokens.refresh_token,
            expires_in=session.tokens.access_expires_in,
        )

    @classmethod
    def for_web(cls, session: Session) -> "SessionResponse":
        return cls(user=UserResponse.from_entity(session.user))
