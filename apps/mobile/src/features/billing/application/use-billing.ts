import { useQuery } from '@tanstack/react-query';

import { billingRepository, type BillingRepository } from '@/features/billing/data/billing-repository';

export const billingKeys = {
  plans: ['billing', 'plans'] as const,
  me: ['billing', 'me'] as const,
};

/** Public: shown to someone deciding whether to sign up. */
export function usePlans(repository: BillingRepository = billingRepository) {
  const query = useQuery({
    queryKey: billingKeys.plans,
    queryFn: () => repository.plans(),
    retry: false,
  });

  return { plans: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/**
 * My plan and what is left of my quota.
 *
 * Resolves to null rather than erroring when billing is not configured or the
 * teacher is not signed in — the gates treat "unknown" as "allowed", so a
 * misconfiguration is generous rather than blocking.
 */
export function useEntitlements(
  { enabled = true }: { enabled?: boolean } = {},
  repository: BillingRepository = billingRepository,
) {
  const query = useQuery({
    queryKey: billingKeys.me,
    queryFn: async () => {
      try {
        return await repository.me();
      } catch {
        return null;
      }
    },
    enabled,
    retry: false,
  });

  return { entitlements: query.data ?? null, isLoading: query.isLoading };
}
