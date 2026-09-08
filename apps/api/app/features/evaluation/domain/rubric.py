"""Rubrics: what an activity measures and how much each part counts.

Pure Python. Every number a teacher sees comes out of this file, which is why
none of it is allowed to depend on the model that produced the raw judgements.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID


class DimensionKind(StrEnum):
    """What a dimension is judging.

    The split matters (PRD 9.1): the platform scores the **prompt** and the
    **result** separately, so a teacher who got a good answer by luck and one
    who wrote a good instruction are not given the same mark.
    """

    PROMPT = "prompt"
    RESULT = "result"


@dataclass(frozen=True)
class Dimension:
    id: UUID
    key: str
    name: str
    description: str
    kind: DimensionKind
    # Relative weight. Not required to sum to 100: weights are normalized at
    # scoring time, so an instructor removing a dimension does not silently
    # rescale everyone else's grade.
    weight: float

    def __post_init__(self) -> None:
        if self.weight <= 0:
            raise ValueError("A dimension weight must be positive")
        if not self.key.strip():
            raise ValueError("A dimension needs a key")


@dataclass(frozen=True)
class Rubric:
    """A versioned set of dimensions.

    Versioned because a grade has to stay explainable: when an instructor edits
    the rubric, submissions already scored keep pointing at the version they
    were judged under (TRD 6.3). Without that, "why did I get this mark?" has
    no answer.
    """

    id: UUID
    version: int
    dimensions: list[Dimension] = field(default_factory=list)

    def __post_init__(self) -> None:
        keys = [dimension.key for dimension in self.dimensions]
        if len(keys) != len(set(keys)):
            raise ValueError("Dimension keys must be unique within a rubric")

    @property
    def total_weight(self) -> float:
        return sum(dimension.weight for dimension in self.dimensions)

    def normalized_weight(self, dimension: Dimension) -> float:
        total = self.total_weight
        return dimension.weight / total if total else 0.0

    def by_key(self, key: str) -> Dimension | None:
        return next((item for item in self.dimensions if item.key == key), None)

    @property
    def keys(self) -> set[str]:
        return {dimension.key for dimension in self.dimensions}
