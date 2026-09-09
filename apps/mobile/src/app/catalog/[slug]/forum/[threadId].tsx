import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { ThreadScreen } from '@/features/forum/presentation/thread-screen';

/** Route composition only — the screen lives in the forum feature. */
export default function Route() {
  return (
    <RequireAuth>
      <ThreadScreen />
    </RequireAuth>
  );
}
