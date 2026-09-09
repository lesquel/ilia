from app.shared.errors import PermissionDeniedError


class PlanDoesNotAllowLevelError(PermissionDeniedError):
    """Enrolling in a level the plan does not cover (PRD 11).

    Permission, not "not found": the course is right there in the catalog, and
    telling a teacher it does not exist would be a lie they can disprove by
    scrolling.
    """

    code = "plan_level_not_allowed"

    def __init__(self, level: str) -> None:
        super().__init__(
            "Your plan does not include courses at this level", detail={"level": level}
        )


class PlanDoesNotAllowCertificatesError(PermissionDeniedError):
    code = "plan_certificates_not_allowed"

    def __init__(self) -> None:
        super().__init__("Your plan does not include downloadable certificates")


class PlanDoesNotAllowPostingError(PermissionDeniedError):
    """Reading the forum is free; writing in it is not (PRD 11)."""

    code = "plan_posting_not_allowed"

    def __init__(self) -> None:
        super().__init__("Your plan lets you read the forum, but not post in it")
