import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { RosterScreen } from '@/features/instructor/presentation/roster-screen';

/** Route composition only — the screen lives in the instructor feature. */
export default function Route() {
  return (
    <RequireAuth>
      <RosterScreen />
    </RequireAuth>
  );
}
