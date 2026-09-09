"""Authoring rules: what an instructor may publish, and when.

Pure Python. These are the rules that stop a half-written course from reaching
a teacher who then gives up on the platform.
"""

from dataclasses import dataclass, field

from app.features.catalog.domain.entities import Course, CourseStatus

MIN_SUMMARY_CHARS = 20


@dataclass(frozen=True)
class PublishReadiness:
    """Whether a course is ready for the catalog, and what is missing.

    The reasons are the product: an instructor told "cannot publish" with no
    explanation will publish anyway by trial and error, or give up.
    """

    blockers: list[str] = field(default_factory=list)

    @property
    def ready(self) -> bool:
        return not self.blockers


def check_publish_readiness(course: Course) -> PublishReadiness:
    """What a course needs before it can appear in the catalog.

    Everything here exists because of a teacher on the other side: an empty
    course wastes the one visit the PRD (§2.2) says we get, and a course with no
    summary is one nobody can decide about from the catalog grid.
    """
    blockers: list[str] = []

    if not course.title.strip():
        blockers.append("El curso necesita un título.")

    if len(course.summary.strip()) < MIN_SUMMARY_CHARS:
        blockers.append(
            f"El resumen necesita al menos {MIN_SUMMARY_CHARS} caracteres: "
            "es lo único que el docente lee en el catálogo antes de decidir."
        )

    if not course.modules:
        blockers.append("El curso no tiene módulos.")
    elif course.lesson_count == 0:
        blockers.append("El curso no tiene ninguna lección.")

    empty_modules = [module.title for module in course.ordered_modules if not module.lessons]
    if empty_modules:
        blockers.append(f"Estos módulos están vacíos: {', '.join(empty_modules)}.")

    return PublishReadiness(blockers=blockers)


def can_unpublish(course: Course) -> bool:
    """A published course can be withdrawn; a draft has nothing to withdraw."""
    return course.status is CourseStatus.PUBLISHED
