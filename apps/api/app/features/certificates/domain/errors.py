from app.shared.errors import ConflictError, NotFoundError


class CertificateNotFoundError(NotFoundError):
    code = "certificate_not_found"

    def __init__(self) -> None:
        super().__init__("No certificate matches that code")


class CriteriaNotMetError(ConflictError):
    """The course has not been earned yet.

    Carries the reasons in `detail`, because "todavía no" with no explanation is
    the most frustrating thing to tell someone who has been working.
    """

    code = "criteria_not_met"

    def __init__(self, missing: list[str]) -> None:
        super().__init__(
            "You have not met the requirements for this certificate yet",
            detail={"missing": missing},
        )


class AlreadyRevokedError(ConflictError):
    code = "already_revoked"

    def __init__(self) -> None:
        super().__init__("That certificate is already revoked")
