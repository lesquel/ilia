"""Dependency wiring for the auth feature.

Resolved at request time from singletons built at startup, never constructed
inside a use case (TRD 5.1).
"""

from datetime import timedelta
from typing import Annotated

import structlog
from fastapi import Depends, Request

from app.core.config import Settings, get_app_settings
from app.core.database import Database
from app.features.auth.application.use_cases import (
    AuthenticateUser,
    ChangePassword,
    CompletePasswordReset,
    GetCurrentUser,
    IssuePasswordReset,
    RefreshSession,
    RegisterUser,
    RequestPasswordReset,
)
from app.features.auth.domain.entities import Role, User
from app.features.auth.domain.errors import InvalidTokenError
from app.features.auth.domain.ports import (
    PasswordHasher,
    PasswordResetTokenRepository,
    ResetAuditLog,
    TokenService,
    UserRepository,
)
from app.features.auth.infrastructure.memory_repository import InMemoryUserRepository
from app.features.auth.infrastructure.memory_reset_repository import (
    InMemoryPasswordResetTokenRepository,
)
from app.features.auth.infrastructure.reset_audit import AdminResetAuditLog
from app.features.auth.infrastructure.security import (
    Argon2PasswordHasher,
    JwtTokenService,
    SystemClock,
)
from app.features.auth.infrastructure.sql_repository import SqlAlchemyUserRepository
from app.features.auth.infrastructure.sql_reset_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from app.features.auth.interface.throttle import build_auth_limiter
from app.features.auth.interface.transport import read_access_token
from app.shared.errors import PermissionDeniedError

SettingsDep = Annotated[Settings, Depends(get_app_settings)]


def build_auth_container(settings: Settings, database: Database | None = None) -> dict[str, object]:
    """Build the auth singletons once, at application startup."""
    users: UserRepository
    resets: PasswordResetTokenRepository
    if database is not None:
        users = SqlAlchemyUserRepository(database)
        resets = SqlAlchemyPasswordResetTokenRepository(database)
    else:
        # Loud on purpose. Silently forgetting every account on restart is the
        # kind of thing that gets discovered in front of a room of teachers.
        structlog.get_logger().warning(
            "auth_using_in_memory_repository",
            detail="ILIA_DATABASE_URL is not set; accounts will be lost on restart",
        )
        users = InMemoryUserRepository()
        resets = InMemoryPasswordResetTokenRepository()

    return {
        "users": users,
        "resets": resets,
        "hasher": Argon2PasswordHasher(),
        # One limiter for the whole process, built here so it outlives requests.
        "limiter": build_auth_limiter(settings),
        "tokens": JwtTokenService(
            secret=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
            access_ttl=timedelta(minutes=settings.access_token_ttl_minutes),
            refresh_ttl=timedelta(days=settings.refresh_token_ttl_days),
        ),
        "clock": SystemClock(),
    }


def get_user_repository(request: Request) -> UserRepository:
    return request.app.state.auth["users"]  # type: ignore[no-any-return]


def get_password_hasher(request: Request) -> PasswordHasher:
    return request.app.state.auth["hasher"]  # type: ignore[no-any-return]


def get_token_service(request: Request) -> TokenService:
    return request.app.state.auth["tokens"]  # type: ignore[no-any-return]


UsersDep = Annotated[UserRepository, Depends(get_user_repository)]
HasherDep = Annotated[PasswordHasher, Depends(get_password_hasher)]
TokensDep = Annotated[TokenService, Depends(get_token_service)]


def get_register_user(request: Request, users: UsersDep, hasher: HasherDep) -> RegisterUser:
    return RegisterUser(
        users=users,
        hasher=hasher,
        tokens=request.app.state.auth["tokens"],
        clock=request.app.state.auth["clock"],
    )


def get_authenticate_user(
    users: UsersDep, hasher: HasherDep, tokens: TokensDep
) -> AuthenticateUser:
    return AuthenticateUser(users=users, hasher=hasher, tokens=tokens)


def get_refresh_session(users: UsersDep, tokens: TokensDep) -> RefreshSession:
    return RefreshSession(users=users, tokens=tokens)


def get_change_password(users: UsersDep, hasher: HasherDep) -> ChangePassword:
    return ChangePassword(users=users, hasher=hasher)


def get_password_reset_repository(request: Request) -> PasswordResetTokenRepository:
    return request.app.state.auth["resets"]  # type: ignore[no-any-return]


ResetsDep = Annotated[PasswordResetTokenRepository, Depends(get_password_reset_repository)]


def get_reset_audit(request: Request) -> ResetAuditLog:
    audit = request.app.state.admin["audit"]
    clock = request.app.state.auth["clock"]
    return AdminResetAuditLog(audit=audit, clock=clock)


ResetAuditDep = Annotated[ResetAuditLog, Depends(get_reset_audit)]


def get_request_password_reset(
    request: Request,
    users: UsersDep,
    resets: ResetsDep,
    hasher: HasherDep,
) -> RequestPasswordReset:
    settings = request.app.state.settings
    clock = request.app.state.auth["clock"]
    return RequestPasswordReset(
        users=users,
        resets=resets,
        hasher=hasher,
        clock=clock,
        token_ttl=timedelta(hours=settings.password_reset_ttl_hours),
    )


def get_issue_password_reset(
    request: Request,
    users: UsersDep,
    resets: ResetsDep,
    hasher: HasherDep,
    audit: ResetAuditDep,
) -> IssuePasswordReset:
    settings = request.app.state.settings
    clock = request.app.state.auth["clock"]
    return IssuePasswordReset(
        users=users,
        resets=resets,
        hasher=hasher,
        clock=clock,
        audit=audit,
        token_ttl=timedelta(hours=settings.password_reset_ttl_hours),
    )


def get_complete_password_reset(
    request: Request,
    users: UsersDep,
    resets: ResetsDep,
    hasher: HasherDep,
    tokens: TokensDep,
    audit: ResetAuditDep,
) -> CompletePasswordReset:
    clock = request.app.state.auth["clock"]
    return CompletePasswordReset(
        users=users,
        resets=resets,
        hasher=hasher,
        tokens=tokens,
        clock=clock,
        audit=audit,
    )


async def get_current_user(
    request: Request,
    settings: SettingsDep,
    users: UsersDep,
    tokens: TokensDep,
) -> User:
    token = read_access_token(request, settings)
    if token is None:
        raise InvalidTokenError("Authentication is required")

    claims = tokens.decode_access(token)
    return await GetCurrentUser(users=users).execute(user_id=claims.subject)


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(minimum: Role):  # type: ignore[no-untyped-def]
    """Role gate for the interface layer.

    Only the role check belongs here. Ownership rules ("is this *my* course?")
    live in the application layer, because they need the entity to decide.
    """

    async def dependency(user: CurrentUser) -> User:
        if not user.has_at_least(minimum):
            raise PermissionDeniedError("You do not have access to this resource")
        return user

    return dependency
