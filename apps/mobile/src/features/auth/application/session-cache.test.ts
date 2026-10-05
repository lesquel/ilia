import { QueryClient } from '@tanstack/query-core';
import { describe, expect, it, vi } from 'vitest';

import { dropSessionData } from './session-cache';

describe('dropSessionData', () => {
  it('removes cached data without refetching active queries, and keeps the auth session', async () => {
    const client = new QueryClient();
    const adminFetch = vi.fn().mockResolvedValue('overview');
    client.setQueryData(['auth', 'session'], null);
    client.setQueryData(['my-courses'], ['x']);

    const observer = client.getQueryCache().build(client, {
      queryKey: ['admin', 'overview'],
      queryFn: adminFetch,
    });
    await observer.fetch();
    adminFetch.mockClear();

    dropSessionData(client);

    expect(client.getQueryData(['admin', 'overview'])).toBeUndefined();
    expect(client.getQueryData(['my-courses'])).toBeUndefined();
    expect(client.getQueryData(['auth', 'session'])).toBeNull();
    expect(adminFetch).not.toHaveBeenCalled();
  });
});
