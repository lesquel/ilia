from app.shared.errors import AuthenticationError, ConflictError, PermissionDeniedError


class EmailAlreadyRegisteredError(ConflictError):
    code = "email_already_registered"

    def __init__(self) -> None:
        super().__init__("That email is already registered")


class InvalidCredentialsError(AuthenticationError):
    """Wrong email or wrong password — deliberately indistinguishable.

    Telling the caller which half was wrong turns the login form into an account
    enumeration oracle: an attacker could confirm which teachers have accounts
    before ever guessing a password.
    """

    code = "invalid_credentials"

    def __init__(self) -> None:
        super().__init__("Email or password is incorrect")


class InactiveAccountError(PermissionDeniedError):
    code = "inactive_account"

    def __init__(self) -> None:
        super().__init__("This account is disabled")


class InvalidTokenError(AuthenticationError):
    code = "invalid_token"

    def __init__(self, message: str = "The session token is invalid or expired") -> None:
        super().__init__(message)
