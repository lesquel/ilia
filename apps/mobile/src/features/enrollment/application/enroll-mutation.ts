import type { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/errors/api-error';
import { catalogKeys } from '@/features/catalog/application/query-keys';
import type { EnrollmentRepository } from '@/features/enrollment/data/enrollment-repository';

import { enrollmentKeys } from './query-keys';

export type EnrollInput = { courseSlug: string; cohortCode?: string };

/**
 * The "Inscribirme" press.
 *
 * The press stays pending until the course progress has been fetched again.
 * Resolving earlier put the button back on screen for the seconds that refetch
 * took, and a teacher who saw it pressed it a second time.
 */
export function enrollMutationOptions(queryClient: QueryClient, repository: EnrollmentRepository) {
  return {
    mutationFn: async (input: EnrollInput): Promise<void> => {
      try {
        await repository.enroll(input);
      } catch (error) {
        // A second press, or a retry after a slow first one, ends here. The
        // teacher is in the course either way, so show the course, not an error.
        if (!(error instanceof ApiError && error.code === 'already_enrolled')) throw error;
      }
    },
    onSuccess: async (_result: void, { courseSlug }: EnrollInput) => {
      // Both lists change: the course now has progress, and "Mis cursos" has a
      // new row. Invalidate rather than patch: the server owns the shape. Only
      // the progress is awaited, because it is what replaces the button.
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.myCourses });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.detail(courseSlug) });
      await queryClient.invalidateQueries({ queryKey: enrollmentKeys.progress(courseSlug) });
    },
  };
}
