import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { LabScreen } from '@/features/lab/presentation/lab-screen';

/** Route composition only — the screen lives in the lab feature. */
export default function Route() {
  return (
    <RequireAuth>
      <LabScreen />
    </RequireAuth>
  );
}
