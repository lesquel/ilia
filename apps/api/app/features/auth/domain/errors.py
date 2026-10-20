from app.shared.errors import (
    AuthenticationError,
    ConflictError,
    PermissionDeniedError,
    ValidationError,
)


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


class SamePasswordError(ConflictError):
    """The new password is the one already in use.

    Rejected rather than silently accepted: a no-op change would end every
    other session while leaving the password an intruder already knows.
    """

    code = "same_password"

    def __init__(self) -> None:
        super().__init__("The new password must be different from the current one")


class InvalidFullNameError(ValidationError):
    """The name is blank or too long once trimmed.

    The request schema already bounds the raw length. This is for what it lets
    through: a name made only of spaces.
    """

    code = "invalid_full_name"

    def __init__(self) -> None:
        super().__init__("The name cannot be empty or too long")


class InvalidAvatarKeyError(ValidationError):
    code = "invalid_avatar_key"

    def __init__(self) -> None:
        super().__init__("Choose an avatar from the available illustrations")


class InvalidAvatarReferenceError(ValidationError):
    code = "invalid_avatar_reference"

    def __init__(self) -> None:
        super().__init__("The uploaded image does not belong to this profile")


class InvalidAvatarImageError(ValidationError):
    code = "unsupported_avatar_image"

    def __init__(self) -> None:
        super().__init__("Choose a JPEG, PNG or WebP image no larger than 5 MiB")


class AvatarImageTooLargeError(ValidationError):
    code = "avatar_image_too_large"

    def __init__(self) -> None:
        super().__init__("The image must be no larger than 5 MiB")
