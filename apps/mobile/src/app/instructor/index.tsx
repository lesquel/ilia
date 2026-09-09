import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { InstructorCoursesScreen } from '@/features/instructor/presentation/courses-screen';

/** Route composition only — the screen lives in the instructor feature. */
export default function Route() {
  return (
    <RequireAuth>
      <InstructorCoursesScreen />
    </RequireAuth>
  );
}
