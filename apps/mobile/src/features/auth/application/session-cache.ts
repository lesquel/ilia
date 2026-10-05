import type { QueryClient } from '@tanstack/react-query';

/**
 * Forget everything the finished session fetched, without refetching it.
 *
 * `invalidateQueries()` refetches every mounted query. At logout that fired one
 * more request from a screen that was about to unmount (`GET /admin/overview`),
 * which the server rightly answered with 401. Removing the data instead leaves
 * nothing to refetch, and the next session starts from a clean cache.
 *
 * The auth session is kept: the caller has just set it to `null`, and dropping
 * it would make the guards treat "logged out" as "still checking".
 */
export function dropSessionData(queryClient: QueryClient): void {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'auth',
  });
}
