import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { ReviewScreen } from '@/features/instructor/presentation/review-screen';

/** Route composition only — the screen lives in the instructor feature. */
export default function Route() {
  return (
    <RequireAuth>
      <ReviewScreen />
    </RequireAuth>
  );
}
