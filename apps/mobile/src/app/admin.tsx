import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { AdminScreen } from '@/features/admin/presentation/admin-screen';
import { RevokePanel } from '@/features/certificates/presentation/revoke-panel';

/**
 * Route composition. The admin dashboard and the certificate panel live in
 * different features; this is where they meet, so neither imports the other.
 *
 * `RequireAuth` answers "are you signed in?"; the screen's own 403 state
 * answers "are you an admin?". Two different questions, two different answers.
 */
export default function Admin() {
  return (
    <RequireAuth>
      <AdminScreen extra={<RevokePanel />} />
    </RequireAuth>
  );
}
