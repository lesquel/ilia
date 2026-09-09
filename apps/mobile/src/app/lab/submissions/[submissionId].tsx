import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { ResultScreen } from '@/features/lab/presentation/result-screen';

/** Route composition only — the screen lives in the lab feature. */
export default function Route() {
  return (
    <RequireAuth>
      <ResultScreen />
    </RequireAuth>
  );
}
