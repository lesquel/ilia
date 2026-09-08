import * as SecureStore from 'expo-secure-store';

import type { TokenStore } from '@/features/auth/domain/repository';

/**
 * Native token storage: Keychain on iOS, Keystore on Android.
 *
 * The web build never loads this file — Metro resolves `token-store.web.ts`
 * instead. See that file for why the web has no equivalent.
 */

const ACCESS_KEY = 'ilia.access_token';
const REFRESH_KEY = 'ilia.refresh_token';

export const tokenStore: TokenStore = {
  async read() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },

  async save({ accessToken, refreshToken }) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}
