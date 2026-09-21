"""The production catalog seed is the real courses, not throwaway demo data.

`seed_demo` still exists for a local instructor login and a cohort code. The
target environment loads courses with `seed_catalog`, which must not invent a
password and must not refuse production — a fresh compose has no courses until
this runs.
"""

import inspect
from pathlib import Path

from app.content.teacher_catalog import TEACHER_COURSES
from scripts.seed_catalog import CANONICAL_SLUGS, CATALOG_COURSES

EXPECTED_SLUGS = (
    "prompting-para-docentes",
    "notebooklm-en-el-aula",
    "evaluacion-asistida-por-ia",
)


def test_catalog_seed_path_publishes_the_three_canonical_slugs() -> None:
    assert CANONICAL_SLUGS == EXPECTED_SLUGS
    assert [course["slug"] for course in CATALOG_COURSES] == list(EXPECTED_SLUGS)


def test_catalog_seed_loads_teacher_catalog_not_a_copy() -> None:
    assert CATALOG_COURSES is TEACHER_COURSES


def test_catalog_seed_does_not_refuse_production() -> None:
    source = inspect.getsource(__import__("scripts.seed_catalog", fromlist=["run"]).run)
    assert "is_production" not in source
    assert "Refusing" not in source


def test_catalog_seed_has_no_demo_password() -> None:
    source = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("scripts", "seed_catalog.py")
        .read_text(encoding="utf-8")
    )
    assert "una-clave-larga" not in source
    assert "eduardo@manta.gob.ec" not in source


def test_demo_seed_still_refuses_production() -> None:
    from scripts.seed_demo import main as seed_demo_main

    source = inspect.getsource(seed_demo_main)
    assert "is_production" in source
    assert "Refusing to seed demo data in production" in source
