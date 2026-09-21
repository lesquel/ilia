"""Creating and listing cohorts.

The rule this file defends: a charla gets a human-readable code that is unique.
Creating the same code twice must fail clearly — silently overwriting would
attribute two talks to one code, which is how the alliance metric becomes a lie.
"""

import pytest

from app.features.enrollment.application.use_cases import CreateCohort, ListCohorts
from app.features.enrollment.domain.errors import CohortCodeTakenError
from app.features.enrollment.infrastructure.memory_repository import InMemoryCohortRepository
from tests.fakes import FrozenClock

COHORT_CODE = "MANTA-SEP-01"
COHORT_NAME = "Charla Manta — septiembre 2026"


@pytest.fixture
def cohorts() -> InMemoryCohortRepository:
    return InMemoryCohortRepository()


@pytest.fixture
def create(cohorts: InMemoryCohortRepository) -> CreateCohort:
    return CreateCohort(cohorts=cohorts, clock=FrozenClock())


@pytest.fixture
def listing(cohorts: InMemoryCohortRepository) -> ListCohorts:
    return ListCohorts(cohorts=cohorts)


class TestCreateCohort:
    async def test_creates_a_cohort_with_its_code(self, create: CreateCohort) -> None:
        cohort = await create.execute(name=COHORT_NAME, code=COHORT_CODE)

        assert cohort.name == COHORT_NAME
        assert cohort.code == COHORT_CODE
        assert cohort.created_at is not None

    async def test_the_same_code_twice_is_a_conflict(self, create: CreateCohort) -> None:
        await create.execute(name=COHORT_NAME, code=COHORT_CODE)

        with pytest.raises(CohortCodeTakenError) as raised:
            await create.execute(name="Otra charla", code=COHORT_CODE)

        assert raised.value.code == "cohort_code_taken"
        assert raised.value.detail["code"] == COHORT_CODE

    async def test_codes_are_unique_regardless_of_case(self, create: CreateCohort) -> None:
        await create.execute(name=COHORT_NAME, code=COHORT_CODE)

        with pytest.raises(CohortCodeTakenError):
            await create.execute(name="Otra charla", code="manta-sep-01")

    async def test_the_code_is_trimmed_and_uppercased(self, create: CreateCohort) -> None:
        cohort = await create.execute(name=f"  {COHORT_NAME}  ", code="  manta-sep-01  ")

        assert cohort.code == COHORT_CODE
        assert cohort.name == COHORT_NAME


class TestListCohorts:
    async def test_lists_code_and_name(self, create: CreateCohort, listing: ListCohorts) -> None:
        await create.execute(name=COHORT_NAME, code=COHORT_CODE)

        items = await listing.execute()

        assert [(item.code, item.name) for item in items] == [(COHORT_CODE, COHORT_NAME)]

    async def test_newest_first(self, create: CreateCohort, listing: ListCohorts) -> None:
        await create.execute(name="Primera", code="MANTA-AGO-01")
        await create.execute(name="Segunda", code="MANTA-SEP-01")

        items = await listing.execute()

        assert [item.code for item in items] == ["MANTA-SEP-01", "MANTA-AGO-01"]
