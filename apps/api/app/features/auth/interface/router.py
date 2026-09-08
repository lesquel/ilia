from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel

from app.features.auth.application.use_cases import (
    AuthenticateUser,
    RefreshSession,
    RegisterUser,
    Session,
)
from app.features.auth.domain.errors import InvalidTokenError
from app.features.auth.interface.dependencies import (
    CurrentUser,
    SettingsDep,
    get_authenticate_user,
    get_refresh_session,
    get_register_user,
)
from app.features.auth.interface.schemas import (
    LoginRequest,
    RegisterRequest,
    SessionResponse,
    UserResponse,
)
from app.features.auth.interface.transport import (
    ClientPlatform,
    clear_session_cookies,
    read_refresh_token,
    set_session_cookies,
)

router = APIRouter(prefix="/auth", tags=["auth"])

RegisterUserDep = Annotated[RegisterUser, Depends(get_register_user)]
AuthenticateUserDep = Annotated[AuthenticateUser, Depends(get_authenticate_user)]
RefreshSessionDep = Annotated[RefreshSession, Depends(get_refresh_session)]


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
    session = await use_case.execute(email=payload.email, password=payload.password)
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
    because it is stateless. Native clients simply discard their own copy. Real
    revocation needs a token denylist, and that needs the database decision.
    """
    clear_session_cookies(response, settings)


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse.from_entity(user)
