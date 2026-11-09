import { HttpClient } from './http-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

describe('HttpClient.patch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends a JSON PATCH request', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const client = new HttpClient({ baseUrl: 'http://localhost:8000' });

    await client.patch('/lessons/lesson-1/position', { position_seconds: 12 });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/lessons/lesson-1/position',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ position_seconds: 12 }),
      }),
    );
  });
});

describe('HttpClient session renewal', () => {
  afterEach(() => vi.unstubAllGlobals());

  const json = (status: number, body: unknown = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('renews the session once and retries after a 401', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { code: 'invalid_token' } }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal('fetch', fetch);
    const refreshSession = vi.fn(async () => true);
    const client = new HttpClient({
      baseUrl: 'http://localhost:8000',
      tokenProvider: { getAccessToken: async () => null, refreshSession },
    });

    await expect(client.get('/catalog/courses')).resolves.toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shares one renewal between requests that fail together', async () => {
    const fetch = vi.fn(async () => json(401));
    vi.stubGlobal('fetch', fetch);
    const refreshSession = vi.fn(async () => false);
    const client = new HttpClient({
      baseUrl: 'http://localhost:8000',
      tokenProvider: { getAccessToken: async () => null, refreshSession },
    });

    await Promise.allSettled([client.get('/a'), client.get('/b')]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('does not renew when the login itself is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(401)));
    const refreshSession = vi.fn(async () => true);
    const client = new HttpClient({
      baseUrl: 'http://localhost:8000',
      tokenProvider: { getAccessToken: async () => null, refreshSession },
    });

    await expect(client.post('/auth/login', {})).rejects.toBeTruthy();
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
