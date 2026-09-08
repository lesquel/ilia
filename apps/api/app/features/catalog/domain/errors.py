from app.shared.errors import NotFoundError, ValidationError


class CourseNotFoundError(NotFoundError):
    code = "course_not_found"

    def __init__(self, slug: str) -> None:
        # Identical for a course that does not exist and one that is still a
        # draft: otherwise the catalog becomes a way to enumerate unpublished
        # work in progress.
        super().__init__("Course not found", detail={"slug": slug})


class InvalidCursorError(ValidationError):
    code = "invalid_cursor"

    def __init__(self) -> None:
        super().__init__("The pagination cursor is not valid")
