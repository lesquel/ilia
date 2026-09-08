/**
 * Runtime configuration.
 *
 * Everything here comes from `EXPO_PUBLIC_*` variables, which are inlined at
 * build time and therefore **public**. Never put a secret in this file: an APK
 * can be unzipped and a web bundle can be read (TRD 9).
 */

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  apiPrefix: '/api/v1',
} as const;

export const apiUrl = `${env.apiBaseUrl}${env.apiPrefix}`;
