from app.shared.errors import ConflictError, NotFoundError, PermissionDeniedError


class AlreadyEnrolledError(ConflictError):
    code = "already_enrolled"

    def __init__(self) -> None:
        super().__init__("You are already enrolled in this course")


class NotEnrolledError(PermissionDeniedError):
    """Marking progress without an enrollment.

    Permission and not "not found": the course exists and the teacher can see
    it, they simply have not joined it yet. Telling them it does not exist would
    be a lie they can disprove by reloading the catalog.
    """

    code = "not_enrolled"

    def __init__(self) -> None:
        super().__init__("You are not enrolled in this course")


class LessonNotInCourseError(NotFoundError):
    code = "lesson_not_found"

    def __init__(self) -> None:
        super().__init__("That lesson does not belong to this course")


class CohortNotFoundError(NotFoundError):
    code = "cohort_not_found"

    def __init__(self, code_value: str) -> None:
        super().__init__("No cohort matches that code", detail={"code": code_value})


class CohortCodeTakenError(ConflictError):
    """Two charlas cannot share a code.

    Silently accepting the second would attribute both talks to one code, which
    is how the alliance metric becomes a lie.
    """

    code = "cohort_code_taken"

    def __init__(self, code_value: str) -> None:
        super().__init__("A cohort with that code already exists", detail={"code": code_value})
