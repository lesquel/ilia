import { httpClient } from '@/core/api/http-client';

import { tokenStore } from './token-store';

/**
 * Hands the HTTP client its source of credentials, once, at startup.
 *
 * On native this returns the token from the secure store. On web it returns
 * null and the request rides on the httpOnly cookie instead — no branch needed
 * here, because `token-store.web.ts` already answers null.
 */
export function installAuthTokenProvider(): void {
  httpClient.setTokenProvider({
    getAccessToken: () => tokenStore.read(),
  });
}
