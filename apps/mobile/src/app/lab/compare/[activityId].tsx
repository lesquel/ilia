import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { CompareAttemptsScreen } from '@/features/lab/presentation/compare-attempts-screen';

/** Route composition only — the screen lives in the lab feature. */
export default function Route() {
  return (
    <RequireAuth>
      <CompareAttemptsScreen />
    </RequireAuth>
  );
}
