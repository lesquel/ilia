import { MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/core/errors/api-error';
import type { EnrollmentRepository } from '@/features/enrollment/data/enrollment-repository';
import type { CourseProgress } from '@/features/enrollment/domain/entities';

import { enrollMutationOptions } from './enroll-mutation';
import { enrollmentKeys } from './query-keys';

const SLUG = 'gemini-paso-a-paso';
const ENROLLED = { percentage: 0 } as unknown as CourseProgress;

/** A course page showing the panel: the progress query is mounted and active. */
async function mountedProgress(queryClient: QueryClient, enrolled: () => boolean) {
  const observer = new QueryObserver(queryClient, {
    queryKey: enrollmentKeys.progress(SLUG),
    // As slow as a real round trip: an un-awaited refetch has not landed yet.
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return enrolled() ? ENROLLED : null;
    },
  });
  observer.subscribe(() => {});
  await observer.refetch();
  return observer;
}

function enrollWith(queryClient: QueryClient, enroll: EnrollmentRepository['enroll']) {
  const repository = { enroll } as unknown as EnrollmentRepository;
  return new MutationObserver(queryClient, enrollMutationOptions(queryClient, repository));
}

describe('enrollMutationOptions', () => {
  it('resolves only after the course progress has been refetched', async () => {
    const queryClient = new QueryClient();
    let enrolled = false;
    await mountedProgress(queryClient, () => enrolled);

    const mutation = enrollWith(queryClient, async () => {
      enrolled = true;
      return {} as never;
    });
    await mutation.mutate({ courseSlug: SLUG });

    // The panel swaps the button for the progress the moment the press ends,
    // so the button never comes back while the refetch is still running.
    expect(queryClient.getQueryData(enrollmentKeys.progress(SLUG))).toBe(ENROLLED);
  });

  it('treats "already enrolled" as success and shows the progress', async () => {
    const queryClient = new QueryClient();
    await mountedProgress(queryClient, () => true);
    queryClient.setQueryData(enrollmentKeys.progress(SLUG), null);

    const mutation = enrollWith(queryClient, async () => {
      throw new ApiError('already_enrolled', 'Already enrolled', 409);
    });
    await mutation.mutate({ courseSlug: SLUG });

    expect(mutation.getCurrentResult().isError).toBe(false);
    expect(queryClient.getQueryData(enrollmentKeys.progress(SLUG))).toBe(ENROLLED);
  });

  it('still reports any other failure', async () => {
    const queryClient = new QueryClient();
    const mutation = enrollWith(queryClient, async () => {
      throw new ApiError('cohort_not_found', 'Cohort not found', 404);
    });

    await expect(mutation.mutate({ courseSlug: SLUG })).rejects.toBeInstanceOf(ApiError);
    expect(mutation.getCurrentResult().isError).toBe(true);
  });
});
