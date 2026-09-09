from app.shared.errors import ConflictError, NotFoundError


class UserNotFoundError(NotFoundError):
    code = "user_not_found"

    def __init__(self) -> None:
        super().__init__("That user does not exist")


class CannotDemoteYourselfError(ConflictError):
    """An admin removing their own admin role.

    Refused because the alternative is a platform with nobody able to grant the
    role back — recoverable only by editing the database by hand.
    """

    code = "cannot_demote_yourself"

    def __init__(self) -> None:
        super().__init__("You cannot change your own role")


class LastAdminError(ConflictError):
    code = "last_admin"

    def __init__(self) -> None:
        super().__init__("There must always be at least one administrator")
