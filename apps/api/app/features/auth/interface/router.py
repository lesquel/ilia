from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel

from app.features.auth.application.use_cases import (
    AuthenticateUser,
    ChangePassword,
    CompletePasswordReset,
    IssuePasswordReset,
    RefreshSession,
    RegisterUser,
    RequestPasswordReset,
    Session,
    UpdateProfile,
)
from app.features.auth.domain.entities import Role, User
from app.features.auth.domain.errors import InvalidTokenError
from app.features.auth.interface.dependencies import (
    CurrentUser,
    SettingsDep,
    get_authenticate_user,
    get_change_password,
    get_complete_password_reset,
    get_issue_password_reset,
    get_refresh_session,
    get_register_user,
    get_request_password_reset,
    get_update_profile,
    require_role,
)
from app.features.auth.interface.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetConfirmRequest,
    PasswordResetIssueRequest,
    PasswordResetIssueResponse,
    PasswordResetRequest,
    RegisterRequest,
    SessionResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.features.auth.interface.throttle import enforce, forget
from app.features.auth.interface.transport import (
    ClientPlatform,
    clear_session_cookies,
    read_refresh_token,
    set_session_cookies,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = structlog.get_logger()

RegisterUserDep = Annotated[RegisterUser, Depends(get_register_user)]
AuthenticateUserDep = Annotated[AuthenticateUser, Depends(get_authenticate_user)]
RefreshSessionDep = Annotated[RefreshSession, Depends(get_refresh_session)]
ChangePasswordDep = Annotated[ChangePassword, Depends(get_change_password)]
UpdateProfileDep = Annotated[UpdateProfile, Depends(get_update_profile)]
RequestPasswordResetDep = Annotated[RequestPasswordReset, Depends(get_request_password_reset)]
IssuePasswordResetDep = Annotated[IssuePasswordReset, Depends(get_issue_password_reset)]
CompletePasswordResetDep = Annotated[CompletePasswordReset, Depends(get_complete_password_reset)]
InstructorUser = Annotated[User, Depends(require_role(Role.INSTRUCTOR))]


def _deliver(
    session: Session,
    request: Request,
    response: Response,
    settings: SettingsDep,
) -> SessionResponse:
    """Hand the session back the way this client can safely hold it."""
    if ClientPlatform.from_request(request) is ClientPlatform.NATIVE:
        return SessionResponse.for_native(session)

    set_session_cookies(
        response,
        settings,
        access_token=session.tokens.access_token,
        refresh_token=session.tokens.refresh_token,
        access_max_age=session.tokens.access_expires_in,
        refresh_max_age=session.tokens.refresh_expires_in,
    )
    return SessionResponse.for_web(session)


@router.post("/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    settings: SettingsDep,
    use_case: RegisterUserDep,
) -> SessionResponse:
    # Registration is rate-limited too: without it the endpoint is a free way to
    # discover which addresses already have accounts, one 409 at a time.
    enforce(request, action="register")

    session = await use_case.execute(
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
    )
    return _deliver(session, request, response, settings)


@router.post("/login", response_model=SessionResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    settings: SettingsDep,
    use_case: AuthenticateUserDep,
) -> SessionResponse:
    enforce(request, action="login")

    session = await use_case.execute(email=payload.email, password=payload.password)

    # Only a success clears the budget. Doing it before the call would make the
    # limit meaningless, since every attempt would reset it.
    forget(request, action="login")

    return _deliver(session, request, response, settings)


class RefreshRequest(BaseModel):
    """Native clients send the refresh token here; web clients send nothing and
    the cookie carries it."""

    refresh_token: str | None = None


@router.post("/refresh", response_model=SessionResponse)
async def refresh(
    request: Request,
    response: Response,
    settings: SettingsDep,
    use_case: RefreshSessionDep,
    payload: RefreshRequest | None = None,
) -> SessionResponse:
    token = read_refresh_token(request, settings, payload.refresh_token if payload else None)
    if token is None:
        raise InvalidTokenError("No refresh token was provided")

    session = await use_case.execute(refresh_token=token)
    return _deliver(session, request, response, settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, settings: SettingsDep) -> None:
    """Clear the browser's cookies.

    Honest about its limits: the access token stays valid until it expires,
    because it is stateless. Native clients simply discard their own copy.

    This deliberately does **not** bump the token generation. Signing out of a
    staffroom computer should not also sign you out of your phone. Ending every
    session at once is what changing the password does.
    """
    clear_session_cookies(response, settings)


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse.from_entity(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UpdateProfileRequest,
    user: CurrentUser,
    use_case: UpdateProfileDep,
) -> UserResponse:
    """Correct your own name. The id comes from the session, never the body."""
    updated = await use_case.execute(user_id=user.id, full_name=payload.full_name)
    return UserResponse.from_entity(updated)


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    use_case: RequestPasswordResetDep,
) -> None:
    """Ask to recover access. Response is always empty — no account enumeration."""
    enforce(request, action="reset_request")
    await use_case.execute(email=payload.email)


@router.post("/password-reset/issue", response_model=PasswordResetIssueResponse)
async def issue_password_reset(
    payload: PasswordResetIssueRequest,
    actor: InstructorUser,
    use_case: IssuePasswordResetDep,
) -> PasswordResetIssueResponse:
    """Instructor/admin-assisted delivery until email is configured (PRD E-01)."""
    issued = await use_case.execute(actor=actor, email=payload.email)
    return PasswordResetIssueResponse(
        reset_token=issued.reset_token,
        expires_at=issued.expires_at,
    )


@router.post("/password-reset/confirm", response_model=SessionResponse)
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    request: Request,
    response: Response,
    settings: SettingsDep,
    use_case: CompletePasswordResetDep,
) -> SessionResponse:
    enforce(request, action="reset_confirm")
    session = await use_case.execute(
        reset_token=payload.reset_token,
        new_password=payload.new_password,
    )
    forget(request, action="reset_confirm")
    return _deliver(session, request, response, settings)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    settings: SettingsDep,
    user: CurrentUser,
    use_case: ChangePasswordDep,
) -> None:
    """Change your own password.

    Every other session ends. This one continues: the person doing it is at the
    keyboard, and signing them out of the browser they are using to fix a
    compromise is punishing the right person.
    """
    # The current password is checked here, so this is another place to guess
    # one — with a session that may not belong to the account's owner.
    enforce(request, action="password")

    changed = await use_case.execute(
        user_id=user.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )

    forget(request, action="password")
    logger.info("password_changed", user_id=str(changed.id))

    # Re-issue this client's credentials under the new generation, or the tab
    # the teacher is looking at would log itself out on the next refresh.
    if ClientPlatform.from_request(request) is not ClientPlatform.NATIVE:
        tokens = request.app.state.auth["tokens"].issue_pair(changed)
        set_session_cookies(
            response,
            settings,
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            access_max_age=tokens.access_expires_in,
            refresh_max_age=tokens.refresh_expires_in,
        )
