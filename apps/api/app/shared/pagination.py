"""One shape for the paginated listings that admins and instructors read.

**Why offset and not the keyset the catalogue uses.** They answer different
questions. The catalogue is an infinite public feed where a keyset cursor is
right: it stays correct while courses are published underneath you, and nobody
asks for "page 7". A directory of users or an audit log is read by someone
looking for a specific row, who wants to know how many there are and to jump
around. Offset gives them that, and these tables are small enough that its cost
does not matter.

**Why `total` is not optional.** Every one of these listings silently truncated
at 100 before this existed, which is worse than falling over: the admin saw a
hundred rows and had no way to know there were three thousand. A page that
cannot say how much it is hiding is a page that lies.
"""

from dataclasses import dataclass

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


@dataclass(frozen=True)
class Page[T]:
    items: list[T]
    total: int
    limit: int
    offset: int

    @property
    def has_more(self) -> bool:
        return self.offset + len(self.items) < self.total
