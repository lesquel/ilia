import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.features.auth.application.use_cases import Session
from app.features.auth.domain.entities import FULL_NAME_MAX_LENGTH, User


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=FULL_NAME_MAX_LENGTH)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_registration_name(cls, value: str) -> str:
        name = value.strip()
        parts = re.split(r"[ '\u2019-]", name)
        if len(name) < 2 or not all(part and part.isalpha() for part in parts):
            raise ValueError("Use letters, spaces, apostrophes or hyphens in the name")
        return name

    @field_validator("password")
    @classmethod
    def validate_registration_password(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("Password must include an uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must include a lowercase letter")
        if not any(char.isdecimal() for char in value):
            raise ValueError("Password must include a number")
        if not any(not char.isalnum() and not char.isspace() for char in value):
            raise ValueError("Password must include a special character")
        return value


class UpdateProfileRequest(BaseModel):
    # The name and nothing else. An `email` sent here is ignored, not applied.
    full_name: str = Field(min_length=1, max_length=FULL_NAME_MAX_LENGTH)


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
