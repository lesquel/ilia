/**
 * A page of results, plus how many exist beyond it.
 *
 * `total` is not optional and not cosmetic. These listings used to truncate
 * silently, so a page of fifty was indistinguishable from a complete list of
 * fifty — and someone looking for a name that was not on it concluded it was
 * not there at all.
 */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** The wire shape, before the items are mapped into domain entities. */
export interface PageDto<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export function mapPage<A, B>(dto: PageDto<A>, map: (item: A) => B): Page<B> {
  return {
    items: dto.items.map(map),
    total: dto.total,
    limit: dto.limit,
    offset: dto.offset,
  };
}

/** Whether anything is being hidden by the current page. */
export function hasMore<T>(page: Page<T> | null | undefined): boolean {
  if (!page) return false;
  return page.offset + page.items.length < page.total;
}
