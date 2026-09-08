import { useLocalSearchParams } from 'expo-router';

import { useSession } from '@/features/auth';
import { CourseDetailScreen } from '@/features/catalog/presentation/course-detail-screen';
import {
  useCompleteLesson,
  useCourseProgress,
} from '@/features/enrollment/application/use-enrollment';
import { EnrollPanel } from '@/features/enrollment/presentation/enroll-panel';

/**
 * Composition of two features.
 *
 * It lives in the route and not inside either feature, because `catalog` must
 * not import `enrollment` — enrollment already depends on catalog, and a cycle
 * would make neither of them separable.
 */
export default function CourseRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const courseSlug = slug ?? '';

  const { isAuthenticated } = useSession();
  const { progress } = useCourseProgress(courseSlug, { enabled: isAuthenticated });
  const completeLesson = useCompleteLesson(courseSlug);

  return (
    <CourseDetailScreen
      enrollmentSlot={<EnrollPanel slug={courseSlug} />}
      completedLessonIds={progress?.completedLessonIds ?? []}
      // Lessons become interactive only once the teacher is enrolled.
      onLessonPress={progress ? (lessonId) => completeLesson.mutate(lessonId) : undefined}
      pendingLessonId={completeLesson.isPending ? completeLesson.variables : null}
    />
  );
}
