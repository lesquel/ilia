import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { CatalogFilters, CoursePage } from '@/features/catalog/domain/entities';
import type { CatalogRepository } from '@/features/catalog/domain/repository';
import { catalogRepository } from '@/features/catalog/data/catalog-repository';

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (filters: CatalogFilters) => ['catalog', 'list', filters] as const,
  detail: (slug: string) => ['catalog', 'detail', slug] as const,
};

/**
 * The paginated catalog.
 *
 * `useInfiniteQuery` rather than a page counter because the API is cursor-based:
 * there is no page N to jump to, only "what comes after this row". Trying to
 * model it as numbered pages is how a client ends up showing duplicates.
 */
export function useCourses(
  filters: CatalogFilters = {},
  repository: CatalogRepository = catalogRepository,
) {
  const query = useInfiniteQuery<CoursePage>({
    queryKey: catalogKeys.list(filters),
    queryFn: ({ pageParam }) =>
      repository.browse({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    // Returning undefined is what tells TanStack Query there is no next page,
    // which is exactly what a null cursor means.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return {
    courses: query.data?.pages.flatMap((page) => page.items) ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
  };
}

export function useCourse(slug: string, repository: CatalogRepository = catalogRepository) {
  const query = useQuery({
    queryKey: catalogKeys.detail(slug),
    queryFn: () => repository.getBySlug(slug),
    enabled: Boolean(slug),
    // The catalog is public and barely changes within a session; refetching it
    // on every focus would spend a teacher's mobile data for nothing.
    staleTime: 5 * 60 * 1000,
  });

  return {
    course: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
