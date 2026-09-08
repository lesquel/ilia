import type { Credentials, Registration, Session, User } from './entities';

/**
 * What the auth feature needs from the outside world.
 *
 * Declared here, implemented in `data`. The screens depend on this interface,
 * never on `fetch`, which is what lets a screen be tested with a fake.
 */
export interface AuthRepository {
  register(input: Registration): Promise<Session>;
  login(credentials: Credentials): Promise<Session>;
  refresh(): Promise<Session>;
  logout(): Promise<void>;
  currentUser(): Promise<User>;
}

/**
 * Where the session credentials live.
 *
 * Two implementations, resolved by platform extension:
 * - `token-store.ts` (native) — Expo SecureStore, backed by Keychain/Keystore.
 * - `token-store.web.ts` (web) — a no-op, because the browser already holds an
 *   httpOnly cookie and anything this file could write would be readable by an
 *   injected script.
 */
export interface TokenStore {
  read(): Promise<string | null>;
  save(tokens: { accessToken: string; refreshToken: string }): Promise<void>;
  clear(): Promise<void>;
}
