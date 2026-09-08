import { Platform } from 'react-native';

import { apiUrl } from '@/core/config/env';
import { ApiError } from '@/core/errors/api-error';

/**
 * Tells the backend which credential transport this client can hold safely:
 * an httpOnly cookie for the browser, a bearer token for the app (TRD 4.5).
 */
const CLIENT_PLATFORM = Platform.OS === 'web' ? 'web' : 'native';

/**
 * Supplies the credentials for a request.
 *
 * It is a seam rather than a concrete implementation because the two platforms
 * cannot share one (TRD 4.5): on mobile the token lives in the OS secure store
 * and travels in an `Authorization` header, while on web an `httpOnly` cookie
 * is the only storage a XSS cannot read — and a cookie needs no header at all.
 *
 * Which of the two the web client uses is still an open decision. Until it is
 * made, this interface is what keeps the choice out of every call site.
 */
export interface AuthTokenProvider {
  getAccessToken(): Promise<string | null>;
}

export interface HttpClientOptions {
  baseUrl?: string;
  tokenProvider?: AuthTokenProvider;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Idempotency key. Required on submissions so a retry over a flaky school
   * connection does not create a second attempt and burn the student's quota
   * (TRD 4.4).
   */
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export class HttpClient {
  private readonly baseUrl: string;
  private tokenProvider?: AuthTokenProvider;

  constructor({ baseUrl = apiUrl, tokenProvider }: HttpClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.tokenProvider = tokenProvider;
  }

  /**
   * Wired once at startup by the composition root.
   *
   * `core` must not import from a feature — that is the dependency rule — so
   * the auth feature hands its token source in rather than this file reaching
   * out for it.
   */
  setTokenProvider(provider: AuthTokenProvider): void {
    this.tokenProvider = provider;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, signal, idempotencyKey, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      'X-Client-Platform': CLIENT_PLATFORM,
      ...headers,
    };

    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (idempotencyKey) {
      requestHeaders['Idempotency-Key'] = idempotencyKey;
    }

    const token = await this.tokenProvider?.getAccessToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        // Sends the session cookie when the web client is cookie-based; inert
        // on native, where there is no cookie jar to send from.
        credentials: 'include',
      });
    } catch (cause) {
      throw ApiError.network(cause);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw ApiError.fromResponse(response.status, payload);
    }

    return payload as T;
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }
}

export const httpClient = new HttpClient();
