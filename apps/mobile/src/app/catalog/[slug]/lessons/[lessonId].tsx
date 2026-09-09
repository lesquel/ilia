import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { LessonScreen } from '@/features/enrollment/presentation/lesson-screen';

/** Route composition only — the screen lives in the enrollment feature. */
export default function Lesson() {
  return (
    <RequireAuth>
      <LessonScreen />
    </RequireAuth>
  );
}
