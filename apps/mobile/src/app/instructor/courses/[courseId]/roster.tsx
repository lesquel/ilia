import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { RosterScreen } from '@/features/instructor/presentation/roster-screen';

/**
 * Composition of two features.
 *
 * The forum panel is handed to the roster as a slot rather than imported by
 * it: `instructor` and `forum` stay separable, and the route is the one place
 * that knows both.
 */
export default function Route() {
  return (
    <RequireAuth>
      <RosterWithForum />
    </RequireAuth>
  );
}

/** Inside the guard, so nothing is fetched for someone who is not signed in. */
function RosterWithForum() {
  return <RosterScreen />;
}
