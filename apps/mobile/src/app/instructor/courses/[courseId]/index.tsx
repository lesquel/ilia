import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { CourseEditorScreen } from '@/features/instructor/presentation/course-editor-screen';

/** Route composition only — the screen lives in the instructor feature. */
export default function Route() {
  return (
    <RequireAuth>
      <CourseEditorScreen />
    </RequireAuth>
  );
}
