import { Redirect, usePathname } from 'expo-router';
import type { ReactElement } from 'react';

import { useSession } from '@/features/auth/application/use-auth';

/**
 * Wraps the screens that need a session.
 *
 * Without it a signed-out visitor opening a shared link gets "No pudimos cargar
 * esta información" — which is not what happened and offers no way forward.
 *
 * The destination travels to the login screen so the person lands where they
 * were going, not on a generic home page. Somebody who clicked a link to one
 * lesson and is dropped into the catalogue has to find it again.
 */
export function RequireAuth({ children }: { children: ReactElement }): ReactElement | null {
  const { isAuthenticated, isLoading } = useSession();
  const pathname = usePathname();

  // Nothing until the session is known: redirecting first and discovering a
  // moment later that the person was signed in would bounce them for nothing.
  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href={`/login?next=${encodeURIComponent(pathname)}`} />;
  }

  return children;
}
