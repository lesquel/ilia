import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isInFlight, type SubmissionResult } from '@/features/lab/domain/entities';
import { labRepository, type LabRepository } from '@/features/lab/data/lab-repository';

export const labKeys = {
  activity: (id: string) => ['lab', 'activity', id] as const,
  result: (id: string) => ['lab', 'result', id] as const,
  submissions: (id: string) => ['lab', 'submissions', id] as const,
};

/** How often to ask whether an evaluation has finished. */
const POLL_INTERVAL_MS = 2000;

export function useActivity(activityId: string, repository: LabRepository = labRepository) {
  const query = useQuery({
    queryKey: labKeys.activity(activityId),
    queryFn: () => repository.activity(activityId),
    enabled: Boolean(activityId),
  });

  return {
    activity: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Poll a submission until it is graded.
 *
 * Evaluation is asynchronous by design (TRD 3), so there is nothing to await —
 * the client asks again until the status settles, and stops the moment it does.
 * Polling forever after a result arrives would spend a teacher's mobile data
 * for nothing.
 */
export function useSubmissionResult(
  submissionId: string,
  repository: LabRepository = labRepository,
) {
  const query = useQuery<SubmissionResult>({
    queryKey: labKeys.result(submissionId),
    queryFn: () => repository.result(submissionId),
    enabled: Boolean(submissionId),
    refetchInterval: (query) => {
      const status = query.state.data?.submission.status;
      return status && isInFlight(status) ? POLL_INTERVAL_MS : false;
    },
  });

  return {
    submission: query.data?.submission ?? null,
    evaluation: query.data?.evaluation ?? null,
    isWaiting: Boolean(query.data && isInFlight(query.data.submission.status)),
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSubmitPrompt(
  activityId: string,
  repository: LabRepository = labRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prompt: string) => repository.submit(activityId, prompt),
    onSuccess: () => {
      // The attempt counter moved, so the activity is stale.
      void queryClient.invalidateQueries({ queryKey: labKeys.activity(activityId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.submissions(activityId) });
    },
  });
}

export function useMySubmissions(
  activityId: string,
  repository: LabRepository = labRepository,
) {
  const query = useQuery({
    queryKey: labKeys.submissions(activityId),
    queryFn: () => repository.mySubmissions(activityId),
    enabled: Boolean(activityId),
  });

  return {
    submissions: query.data ?? [],
    isLoading: query.isLoading,
  };
}
