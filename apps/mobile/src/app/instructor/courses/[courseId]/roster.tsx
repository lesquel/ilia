import { useLocalSearchParams } from 'expo-router';

import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { RecentThreadsPanel } from '@/features/forum';
import { useAuthoredCourseDetail } from '@/features/instructor';
import { RosterScreen } from '@/features/instructor/presentation/roster-screen';

/**
 * Composition of two features.
 *
 * The forum panel is handed to the roster as a slot rather than imported by
 * it: `instructor` and `forum` stay separable, and the route is the one place
 * that knows both.
 */
export default function Route() {
  return (
    <RequireAuth>
      <RosterWithForum />
    </RequireAuth>
  );
}

/** Inside the guard, so nothing is fetched for someone who is not signed in. */
function RosterWithForum() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  // The forum is addressed by slug and this route by id. The screen already
  // loads the course, so this is the same cached query, not a second request.
  const { course } = useAuthoredCourseDetail(courseId ?? '');

  return <RosterScreen commentsSlot={<RecentThreadsPanel slug={course?.slug ?? ''} />} />;
}
