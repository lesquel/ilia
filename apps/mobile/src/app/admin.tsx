import { AdminScreen } from '@/features/admin/presentation/admin-screen';
import { RevokePanel } from '@/features/certificates/presentation/revoke-panel';

/**
 * Route composition. The admin dashboard and the certificate panel live in
 * different features; this is where they meet, so neither imports the other.
 */
export default function Admin() {
  return <AdminScreen extra={<RevokePanel />} />;
}
