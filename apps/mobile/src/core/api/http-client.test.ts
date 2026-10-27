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
