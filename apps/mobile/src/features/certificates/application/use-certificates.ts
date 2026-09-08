import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  certificateRepository,
  type CertificateRepository,
} from '@/features/certificates/data/certificate-repository';

export const certificateKeys = {
  mine: ['certificates', 'me'] as const,
  eligibility: (slug: string) => ['certificates', 'eligibility', slug] as const,
  verification: (code: string) => ['certificates', 'verify', code] as const,
};

export function useMyCertificates(
  repository: CertificateRepository = certificateRepository,
) {
  const query = useQuery({
    queryKey: certificateKeys.mine,
    queryFn: () => repository.mine(),
  });

  return {
    certificates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useEligibility(
  slug: string,
  { enabled = true }: { enabled?: boolean } = {},
  repository: CertificateRepository = certificateRepository,
) {
  const query = useQuery({
    queryKey: certificateKeys.eligibility(slug),
    queryFn: () => repository.eligibility(slug),
    enabled: enabled && Boolean(slug),
    // Not retried on failure: "not enrolled" answers 403 and would fail
    // identically forever.
    retry: false,
  });

  return {
    eligibility: query.data ?? null,
    isLoading: query.isLoading,
  };
}

export function useIssueCertificate(
  slug: string,
  repository: CertificateRepository = certificateRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => repository.issue(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: certificateKeys.mine });
      void queryClient.invalidateQueries({ queryKey: certificateKeys.eligibility(slug) });
    },
  });
}

/** Public: this one is used by people who do not have an account. */
export function useVerification(
  code: string,
  repository: CertificateRepository = certificateRepository,
) {
  const query = useQuery({
    queryKey: certificateKeys.verification(code),
    queryFn: () => repository.verify(code),
    enabled: Boolean(code),
    retry: false,
  });

  return {
    verification: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
