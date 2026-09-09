import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogKeys } from '@/features/catalog/application/use-catalog';
import {
  instructorRepository,
  type CourseInput,
  type InstructorRepository,
  type LessonInput,
} from '@/features/instructor/data/instructor-repository';

export const instructorKeys = {
  courses: ['instructor', 'courses'] as const,
  inbox: (courseId?: string) => ['instructor', 'inbox', courseId ?? 'all'] as const,
  roster: (courseId: string) => ['instructor', 'roster', courseId] as const,
};

export function useAuthoredCourses(
  repository: InstructorRepository = instructorRepository,
) {
  const query = useQuery({
    queryKey: instructorKeys.courses,
    queryFn: () => repository.courses(),
    // A 403 for a student would fail identically forever.
    retry: false,
  });

  return {
    courses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

function useCourseMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instructorKeys.courses });
      // Publishing changes what the public catalog shows, so that goes stale too.
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}

export function useCreateCourse(repository: InstructorRepository = instructorRepository) {
  return useCourseMutation((input: CourseInput) => repository.create(input));
}

export function useUpdateCourse(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  return useCourseMutation((input: CourseInput) => repository.update(courseId, input));
}

export function usePublishCourse(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  return useCourseMutation(() => repository.publish(courseId));
}

export function useUnpublishCourse(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  return useCourseMutation(() => repository.unpublish(courseId));
}

export function useAddModule(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  return useCourseMutation((title: string) => repository.addModule(courseId, title));
}

export function useAddLesson(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  return useCourseMutation((args: { moduleId: string; input: LessonInput }) =>
    repository.addLesson(courseId, args.moduleId, args.input),
  );
}

export function useReviewInbox(
  courseId?: string,
  repository: InstructorRepository = instructorRepository,
) {
  const query = useQuery({
    queryKey: instructorKeys.inbox(courseId),
    queryFn: () => repository.inbox(courseId),
    retry: false,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useOverrideScore(
  courseId?: string,
  repository: InstructorRepository = instructorRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { submissionId: string; total: number; reason: string }) =>
      repository.override(args.submissionId, args.total, args.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instructorKeys.inbox(courseId) });
    },
  });
}

export function useRoster(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  const query = useQuery({
    queryKey: instructorKeys.roster(courseId),
    queryFn: () => repository.roster(courseId),
    enabled: Boolean(courseId),
    retry: false,
  });

  return {
    roster: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
