import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { AdminScreen } from '@/features/admin/presentation/admin-screen';
/**
 * `RequireAuth` answers "are you signed in?"; the screen's own 403 state
 * answers "are you an admin?". Two different questions, two different answers.
 */
export default function Admin() {
  return (
    <RequireAuth>
      <AdminScreen />
    </RequireAuth>
  );
}
