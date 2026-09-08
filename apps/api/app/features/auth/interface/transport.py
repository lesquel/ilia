"""How credentials travel, per platform.

This module is the whole of the decision recorded in TRD 4.5. Two clients, two
storages, one set of use cases that knows about neither:

- **Web** — tokens go out as `httpOnly` cookies. A cookie the page cannot read is
  a cookie an XSS payload cannot exfiltrate. `localStorage` offers no such thing.
- **Native** — tokens go out in the response body, and the app puts them in the
  OS secure store (Keychain / Keystore). There is no cookie jar to protect.

The client declares which it is with `X-Client-Platform`. Absent, we assume web:
if the header is ever lost to a proxy, the safe failure is issuing a cookie a
native client will ignore, not handing a browser a readable token.
"""

from enum import StrEnum

from fastapi import Request, Response

from app.core.config import Settings

CLIENT_PLATFORM_HEADER = "X-Client-Platform"


class ClientPlatform(StrEnum):
    WEB = "web"
    NATIVE = "native"

    @classmethod
    def from_request(cls, request: Request) -> "ClientPlatform":
        raw = request.headers.get(CLIENT_PLATFORM_HEADER, "").strip().lower()
        return cls.NATIVE if raw == cls.NATIVE.value else cls.WEB


def set_session_cookies(
    response: Response,
    settings: Settings,
    *,
    access_token: str,
    refresh_token: str,
    access_max_age: int,
    refresh_max_age: int,
) -> None:
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain,
    }

    response.set_cookie(
        settings.session_cookie_name,
        access_token,
        max_age=access_max_age,
        path="/",
        **common,  # type: ignore[arg-type]
    )

    # Scoped to the refresh endpoint alone. A cookie that is not sent with every
    # request is a cookie that cannot be replayed by every request.
    response.set_cookie(
        settings.refresh_cookie_name,
        refresh_token,
        max_age=refresh_max_age,
        path="/api/v1/auth/refresh",
        **common,  # type: ignore[arg-type]
    )


def clear_session_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        domain=settings.cookie_domain,
    )
    response.delete_cookie(
        settings.refresh_cookie_name,
        path="/api/v1/auth/refresh",
        domain=settings.cookie_domain,
    )


def read_access_token(request: Request, settings: Settings) -> str | None:
    """Bearer header first, then the session cookie.

    Order matters: a native client that also happens to carry a cookie should be
    identified by the credential it deliberately sent.
    """
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token:
        return token

    return request.cookies.get(settings.session_cookie_name)


def read_refresh_token(request: Request, settings: Settings, body_token: str | None) -> str | None:
    if body_token:
        return body_token
    return request.cookies.get(settings.refresh_cookie_name)
