import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/errors/api-error';

/**
 * Retry policy tuned for the real network these teachers are on: school Wi-Fi
 * that drops. A transient failure deserves another try; a 403 or a 422 will
 * fail identically forever and retrying it only wastes the user's data.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.isRetryable) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        // Mutations are never retried automatically. A submission retried
        // without an idempotency key would double-charge the student's quota.
        retry: false,
      },
    },
  });
}
