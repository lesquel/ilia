import { useQuery } from '@tanstack/react-query';

import { labRepository, type LabRepository } from '@/features/lab/data/lab-repository';

export const globalSubmissionKeys = {
  all: ['lab', 'global-submissions'] as const,
};

/**
 * Every lab attempt of the signed-in teacher, newest first.
 *
 * One request (`GET /lab/submissions`). It used to walk every activity of
 * every enrolled course, one request each.
 */
export function useGlobalSubmissionHistory(
  enabled: boolean,
  repository: LabRepository = labRepository,
) {
  const query = useQuery({
    queryKey: globalSubmissionKeys.all,
    queryFn: () => repository.myHistory(),
    enabled,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
