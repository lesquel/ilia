import { AccountScreen } from '@/features/auth/presentation/account-screen';
import { RequireAuth } from '@/features/auth/presentation/require-auth';

/** Route composition only — the screen lives in the auth feature. */
export default function Account() {
  return (
    <RequireAuth>
      <AccountScreen />
    </RequireAuth>
  );
}
