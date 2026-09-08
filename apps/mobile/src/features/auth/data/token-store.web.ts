import type { TokenStore } from '@/features/auth/domain/repository';

/**
 * Web token storage: deliberately none.
 *
 * On web the session is an httpOnly cookie the backend set. The browser sends
 * it automatically and this code cannot read it — which is exactly the point.
 *
 * The temptation is to "fix" this with `localStorage`. Don't: anything
 * `localStorage` holds, an injected script can read and exfiltrate, and the
 * prompts in this product can contain schoolchildren's names and grades.
 * Storing nothing is not a gap here; it is the feature.
 */
export const tokenStore: TokenStore = {
  async read() {
    return null;
  },

  async save() {
    // Nothing to do: the cookie is already set by the response.
  },

  async clear() {
    // The backend clears the cookie on POST /auth/logout.
  },
};

export async function readRefreshToken(): Promise<string | null> {
  return null;
}
