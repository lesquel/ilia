import type { ActivityInput } from '@/features/instructor/data/instructor-repository';
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
  offset = 0,
  repository: InstructorRepository = instructorRepository,
) {
  const query = useQuery({
    queryKey: [...instructorKeys.inbox(courseId), offset],
    queryFn: () => repository.inbox(courseId, offset),
    retry: false,
  });

  return {
    items: query.data?.items ?? [],
    // How many are actually waiting. An instructor seeing fifty rows with no
    // total cannot tell a full inbox from an almost-empty one, and plans their
    // afternoon on the difference.
    total: query.data?.total ?? 0,
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

/**
 * Upload a lesson's media, in the three steps the flow actually has.
 *
 * 1. Ask the API where to put it. The key comes from the server — a client that
 *    picks its own can write over another course's video.
 * 2. PUT the file straight to the storage. Not through our API: a hundred
 *    megabytes travelling through it would hold a worker for minutes.
 * 3. Tell the API it landed, so the lesson points at it.
 *
 * Step 2 uses `fetch` rather than the app's HTTP client on purpose: the client
 * attaches our session credentials, and sending those to a third-party storage
 * host would hand them somewhere they do not belong.
 */
export function useUploadLessonMedia(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, file }: { lessonId: string; file: File }) => {
      const contentType = file.type || 'application/octet-stream';
      const target = await repository.prepareMedia(courseId, lessonId, contentType);

      const uploaded = await fetch(target.uploadUrl, {
        method: 'PUT',
        // Must match what was signed, or the storage refuses it.
        headers: { 'Content-Type': contentType },
        body: file,
        credentials: 'omit',
      });

      if (!uploaded.ok) {
        // The lesson is left untouched: attaching a reference to a file that
        // did not arrive would give a teacher a player that plays nothing.
        throw new Error(`upload_failed_${uploaded.status}`);
      }

      await repository.attachMedia(courseId, lessonId, target.reference);
      return target.reference;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instructorKeys.courses });
    },
  });
}

export function useRemoveLessonMedia(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => repository.attachMedia(courseId, lessonId, null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instructorKeys.courses });
    },
  });
}

/**
 * Author a lab activity.
 *
 * The rubric travels with it: an activity without one is an activity a teacher
 * can open and that cannot grade them.
 */
export function useAddActivity(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, input }: { moduleId: string; input: ActivityInput }) =>
      repository.addActivity(courseId, moduleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instructorKeys.courses });
    },
  });
}

/**
 * The syllabus of a course you are writing.
 *
 * Not `useCourse(slug)` from the catalog: that endpoint answers 404 for
 * anything unpublished, so a draft's modules and lessons never appeared and an
 * instructor could reasonably conclude nothing was being saved.
 */
export function useAuthoredCourseDetail(
  courseId: string,
  repository: InstructorRepository = instructorRepository,
) {
  const query = useQuery({
    queryKey: [...instructorKeys.courses, courseId, 'detail'],
    queryFn: () => repository.detail(courseId),
    enabled: Boolean(courseId),
    retry: false,
  });

  return { course: query.data ?? null, isLoading: query.isLoading, error: query.error };
}
