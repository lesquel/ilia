import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { ForumScreen } from '@/features/forum/presentation/forum-screen';

/** Route composition only — the screen lives in the forum feature. */
export default function Route() {
  return (
    <RequireAuth>
      <ForumScreen />
    </RequireAuth>
  );
}
