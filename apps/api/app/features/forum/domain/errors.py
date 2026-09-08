from app.shared.errors import NotFoundError, PermissionDeniedError, ValidationError


class ThreadNotFoundError(NotFoundError):
    code = "thread_not_found"

    def __init__(self) -> None:
        super().__init__("That discussion does not exist")


class ForumAccessDeniedError(PermissionDeniedError):
    """Reading or posting without being enrolled.

    Permission, not "not found": the course exists and the teacher can see it in
    the catalog. Pretending the forum is missing would be a lie they can
    disprove by looking at the course page.
    """

    code = "forum_access_denied"

    def __init__(self) -> None:
        super().__init__("You need to be enrolled in this course to use its forum")


class NotAModeratorError(PermissionDeniedError):
    code = "not_a_moderator"

    def __init__(self) -> None:
        super().__init__("Only the course instructor or an admin can moderate")


class InvalidMessageError(ValidationError):
    code = "invalid_message"

    def __init__(self, message: str) -> None:
        super().__init__(message)
