import { useQuery } from '@tanstack/react-query';

import { catalogRepository } from '@/features/catalog/data/catalog-repository';
import { enrollmentRepository } from '@/features/enrollment/data/enrollment-repository';
import { labRepository } from '@/features/lab/data/lab-repository';

import { loadGlobalSubmissionHistory } from './load-global-submissions';

export const globalSubmissionKeys = {
  all: ['lab', 'global-submissions'] as const,
};

export function useGlobalSubmissionHistory(enabled: boolean) {
  const query = useQuery({
    queryKey: globalSubmissionKeys.all,
    queryFn: () =>
      loadGlobalSubmissionHistory(enrollmentRepository, catalogRepository, labRepository),
    enabled,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
