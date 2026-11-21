/**
 * Runtime configuration.
 *
 * Everything here comes from `EXPO_PUBLIC_*` variables, which are inlined at
 * build time and therefore **public**. Never put a secret in this file: an APK
 * can be unzipped and a web bundle can be read (TRD 9).
 */

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  apiPrefix: '/api/v1',
  // Public address of the web app, used for links a phone shares (certificate
  // QR). Unset means a phone has no link to give, so sharing stays hidden there.
  webBaseUrl: process.env.EXPO_PUBLIC_WEB_URL || undefined,
} as const;

export const apiUrl = `${env.apiBaseUrl}${env.apiPrefix}`;
