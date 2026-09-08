import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/errors/api-error';
import { catalogKeys } from '@/features/catalog/application/use-catalog';
import type { CourseProgress } from '@/features/enrollment/domain/entities';
import {
  enrollmentRepository,
  type EnrollmentRepository,
} from '@/features/enrollment/data/enrollment-repository';

export const enrollmentKeys = {
  all: ['enrollment'] as const,
  myCourses: ['enrollment', 'my-courses'] as const,
  progress: (slug: string) => ['enrollment', 'progress', slug] as const,
  lesson: (slug: string, lessonId: string) =>
    ['enrollment', 'lesson', slug, lessonId] as const,
};

/**
 * One lesson's material.
 *
 * The response carries its own neighbours, so moving through a course costs one
 * request per lesson and not three.
 */
export function useLesson(
  slug: string,
  lessonId: string,
  repository: EnrollmentRepository = enrollmentRepository,
) {
  const query = useQuery({
    queryKey: enrollmentKeys.lesson(slug, lessonId),
    queryFn: () => repository.lesson(slug, lessonId),
    enabled: Boolean(slug && lessonId),
  });

  return {
    lesson: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMyCourses(repository: EnrollmentRepository = enrollmentRepository) {
  const query = useQuery({
    queryKey: enrollmentKeys.myCourses,
    queryFn: () => repository.myCourses(),
  });

  return {
    courses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Progress for one course.
 *
 * A 403 means "not enrolled", which is a normal state for a teacher browsing
 * the catalog — not an error to shout about. It resolves to null so the screen
 * can show "Inscribirme" instead of a failure.
 */
export function useCourseProgress(
  slug: string,
  { enabled = true }: { enabled?: boolean } = {},
  repository: EnrollmentRepository = enrollmentRepository,
) {
  const query = useQuery<CourseProgress | null>({
    queryKey: enrollmentKeys.progress(slug),
    queryFn: async () => {
      try {
        return await repository.progressFor(slug);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'not_enrolled') {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && Boolean(slug),
  });

  return {
    progress: query.data ?? null,
    isEnrolled: Boolean(query.data),
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useEnroll(repository: EnrollmentRepository = enrollmentRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { courseSlug: string; cohortCode?: string }) =>
      repository.enroll(input),
    onSuccess: (_enrollment, { courseSlug }) => {
      // Both lists change: the course now has progress, and "Mis cursos" has a
      // new row. Invalidate rather than patch — the server owns the shape.
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.progress(courseSlug) });
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.myCourses });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.detail(courseSlug) });
    },
  });
}

export function useCompleteLesson(
  slug: string,
  repository: EnrollmentRepository = enrollmentRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => repository.completeLesson(slug, lessonId),
    onSuccess: (progress) => {
      // The endpoint returns the whole progress, so the cache is written
      // directly instead of firing a second request over a connection that may
      // not be there.
      queryClient.setQueryData(enrollmentKeys.progress(slug), progress);
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.myCourses });
      // The lesson view carries its own `is_completed`, so it goes stale too.
      void queryClient.invalidateQueries({ queryKey: ['enrollment', 'lesson', slug] });
    },
  });
}
