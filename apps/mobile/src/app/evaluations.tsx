import { EvaluationsScreen } from '@/features/lab';
import { RequireAuth } from '@/features/auth/presentation/require-auth';

/** Mockup #12 — global attempt history (composed client-side; no list API). */
export default function EvaluationsRoute() {
  return (
    <RequireAuth>
      <EvaluationsScreen />
    </RequireAuth>
  );
}
