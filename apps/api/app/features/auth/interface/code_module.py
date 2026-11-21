"""Delegated, audience-limited access to the independent Laravel code module.

The browser gets a 60-second handoff, never the platform's access/refresh token.
Laravel consumes the handoff id atomically and revalidates delegated identity
on each protected request. The platform remains authoritative for role/activity.
"""

import hmac
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import jwt
import structlog
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.features.auth.domain.entities import User
from app.features.auth.interface.dependencies import (
    CurrentUser,
    SettingsDep,
    TokensDep,
    UsersDep,
)
from app.features.auth.interface.schemas import UserResponse
from app.features.auth.interface.throttle import enforce
from app.features.auth.interface.transport import read_access_token

router = APIRouter(prefix="/auth/code-module", tags=["code-module"])
ISSUER = "ilia-code-module"
AUDIENCE = "ilia-entregas-codigo"
logger = structlog.get_logger()


class TicketInput(BaseModel):
    ticket: str = Field(min_length=16, max_length=4096)


def _secret(settings: SettingsDep) -> str:
    secret = settings.code_module_shared_secret
    if len(secret.encode()) < 32 or secret == settings.jwt_secret:
        raise HTTPException(503, "La integración del módulo no está configurada.")
    return secret


def _service(request: Request, settings: SettingsDep) -> str:
    secret = _secret(settings)
    if not hmac.compare_digest(request.headers.get("X-Module-Key", ""), secret):
        raise HTTPException(401, "Servicio no autorizado.")
    return secret


def _decode(token: str, secret: str, kind: str) -> dict[str, Any]:
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["exp", "iat", "sub", "iss", "aud", "jti", "gen", "kind"]},
        )
        UUID(claims["sub"])
        UUID(claims["jti"])
        if claims["kind"] != kind or type(claims["gen"]) is not int:
            raise ValueError("invalid delegation")
        return claims
    except (jwt.PyJWTError, ValueError, TypeError, KeyError) as exc:
        raise HTTPException(401, "Acceso al módulo inválido o vencido.") from exc


async def _user(claims: dict[str, Any], users: UsersDep) -> User:
    user = await users.get_by_id(UUID(claims["sub"]))
    if user is None or not user.is_active or user.token_generation != claims["gen"]:
        raise HTTPException(401, "La cuenta o sesión ya no está disponible.")
    return user


def _headers(response: Response, request: Request) -> str:
    response.headers["Cache-Control"] = "no-store"
    raw = request.headers.get("X-Request-Id", "")
    try:
        correlation = str(UUID(raw))
    except ValueError:
        correlation = str(uuid4())
    response.headers["X-Correlation-ID"] = correlation
    return correlation


@router.post("/ticket")
async def issue_ticket(
    request: Request,
    response: Response,
    user: CurrentUser,
    settings: SettingsDep,
    tokens: TokensDep,
) -> dict[str, Any]:
    enforce(request, action="code_module")
    secret = _secret(settings)
    # Cookie-authenticated POSTs must originate in our configured web client.
    if (
        not request.headers.get("Authorization", "").lower().startswith("bearer ")
        and request.headers.get("Origin", "") not in settings.cors_origins
    ):
        raise HTTPException(403, "Origen no autorizado.")
    access = tokens.decode_access(read_access_token(request, settings) or "")
    if access.generation != user.token_generation:
        raise HTTPException(401, "Inicia sesión nuevamente en ILIA.")
    now = int(datetime.now(UTC).timestamp())
    session_exp = min(int(access.expires_at.timestamp()), now + 900)
    claims: dict[str, Any] = {
        "sub": str(user.id),
        "gen": user.token_generation,
        "jti": str(uuid4()),
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": min(now + 60, session_exp),
        "session_exp": session_exp,
        "kind": "handoff",
    }
    correlation = _headers(response, request)
    logger.info("code_module.ticket_issued", user_id=str(user.id), correlation_id=correlation)
    return {
        "ticket": jwt.encode(claims, secret, algorithm="HS256"),
        "expires_in": max(0, claims["exp"] - now),
        "correlation_id": correlation,
    }


@router.post("/exchange")
async def exchange(
    payload: TicketInput,
    request: Request,
    response: Response,
    settings: SettingsDep,
    users: UsersDep,
) -> dict[str, Any]:
    secret = _service(request, settings)
    claims = _decode(payload.ticket, secret, "handoff")
    user = await _user(claims, users)
    now = int(datetime.now(UTC).timestamp())
    expires = claims.get("session_exp")
    if type(expires) is not int or expires <= now or expires > now + 900:
        raise HTTPException(401, "Acceso al módulo vencido.")
    session = {**claims, "jti": str(uuid4()), "kind": "session", "iat": now, "exp": expires}
    correlation = _headers(response, request)
    logger.info("code_module.exchanged", user_id=str(user.id), correlation_id=correlation)
    return {
        "user": UserResponse.from_entity(user).model_dump(mode="json"),
        "ticket_id": claims["jti"],
        "ticket_expires_at": claims["exp"],
        "session_token": jwt.encode(session, secret, algorithm="HS256"),
        "expires_at": expires,
        "correlation_id": correlation,
    }


@router.get("/identity")
async def identity(
    request: Request,
    response: Response,
    settings: SettingsDep,
    users: UsersDep,
) -> dict[str, Any]:
    secret = _service(request, settings)
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(401, "Autenticación requerida.")
    claims = _decode(token, secret, "session")
    user = await _user(claims, users)
    correlation = _headers(response, request)
    logger.info("code_module.identity_verified", user_id=str(user.id), correlation_id=correlation)
    return {
        "user": UserResponse.from_entity(user).model_dump(mode="json"),
        "expires_at": claims["exp"],
        "correlation_id": correlation,
    }
