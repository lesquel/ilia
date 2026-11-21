import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_SCOPED_PREFIXES, clearSessionScopedStorage } from './session-scope';

const data = new Map<string, string>();

vi.mock('./key-value-store', () => ({
  keyValueStore: {
    async read(key: string) {
      return data.get(key) ?? null;
    },
    async write(key: string, value: string) {
      data.set(key, value);
    },
    async remove(key: string) {
      data.delete(key);
    },
    async keys(prefix: string) {
      return [...data.keys()].filter((key) => key.startsWith(prefix));
    },
  },
}));

describe('session-scoped storage', () => {
  beforeEach(() => data.clear());

  it('keeps the draft prefix first, where the draft store reads it', () => {
    expect(SESSION_SCOPED_PREFIXES[0]).toBe('ilia.draft.');
  });

  it('wipes drafts and saved recipes at logout and nothing else', async () => {
    data.set('ilia.draft.act-1', '{}');
    data.set('ilia.recipes.u1', '[]');
    data.set('ilia.theme', 'dark');

    await clearSessionScopedStorage();

    expect([...data.keys()]).toEqual(['ilia.theme']);
  });
});
