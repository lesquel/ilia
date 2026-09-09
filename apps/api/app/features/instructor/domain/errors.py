from app.shared.errors import ConflictError, NotFoundError, PermissionDeniedError


class NotYourCourseError(PermissionDeniedError):
    """Editing a course you do not own.

    Instructors own their courses; admins own everything (PRD 5.2, 5.3).
    """

    code = "not_your_course"

    def __init__(self) -> None:
        super().__init__("This course belongs to another instructor")


class CourseNotReadyError(ConflictError):
    """Publishing a course that is not finished.

    Carries the blockers in `detail`: an instructor told "cannot publish" with
    no explanation will publish by trial and error, or give up.
    """

    code = "course_not_ready"

    def __init__(self, blockers: list[str]) -> None:
        super().__init__("This course is not ready to be published", detail={"blockers": blockers})


class NotPublishedError(ConflictError):
    code = "not_published"

    def __init__(self) -> None:
        super().__init__("That course is not published")


class SlugTakenError(ConflictError):
    code = "slug_taken"

    def __init__(self, slug: str) -> None:
        super().__init__("Another course already uses that address", detail={"slug": slug})


class ModuleNotFoundError(NotFoundError):
    code = "module_not_found"

    def __init__(self) -> None:
        super().__init__("That module does not exist in this course")


class PublishedSlugChangeError(ConflictError):
    """The course is published and its address is already in circulation.

    Withdrawing it from the catalogue first is the honest way through: it makes
    the breakage a decision somebody took, rather than one that happened to
    students without anyone noticing.
    """

    code = "published_slug_change"

    def __init__(self) -> None:
        super().__init__(
            "A published course's address cannot change. Withdraw it from the catalogue first"
        )
