import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';

import { useSession } from '@/features/auth/application/use-auth';

/**
 * Wraps the screens that only make sense to someone signed out.
 *
 * Without it a signed-in teacher can open the sign-up form and register a
 * second account, silently replacing the session they were already in — on a
 * shared computer, under someone else's name.
 */
export function GuestOnly({ children }: { children: ReactElement }): ReactElement | null {
  const { isAuthenticated, isLoading } = useSession();

  // Nothing until the session is known. Rendering the form first and yanking it
  // away a moment later is worse than a blank frame.
  if (isLoading) return null;
  if (isAuthenticated) return <Redirect href="/catalog" />;

  return children;
}
