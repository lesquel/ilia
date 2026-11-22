import type { CatalogFilters } from '@/features/catalog/domain/entities';

/** Cache keys for the catalog, apart from the hooks so pure code can use them. */
export const catalogKeys = {
  all: ['catalog'] as const,
  list: (filters: CatalogFilters) => ['catalog', 'list', filters] as const,
  detail: (slug: string) => ['catalog', 'detail', slug] as const,
};
