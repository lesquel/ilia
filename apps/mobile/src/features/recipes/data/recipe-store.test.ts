import { describe, expect, it, vi } from 'vitest';

import type { KeyValueStore } from '@/core/storage/key-value';

import { RecipeStore } from './recipe-store';
import type { Recipe } from '../domain/recipe';

// The real native store pulls AsyncStorage, which does not load under node.
vi.mock('@/core/storage/key-value-store', () => ({ keyValueStore: {} }));

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async read(key) {
      return data.get(key) ?? null;
    },
    async write(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
    async keys(prefix) {
      return [...data.keys()].filter((key) => key.startsWith(prefix));
    },
  };
}

const recipe: Recipe = {
  id: 'sub-1',
  prompt: 'Escribe tres preguntas',
  activityTitle: 'Fracciones',
  score: 88,
  savedAt: '2026-11-20T10:00:00.000Z',
};

describe('RecipeStore', () => {
  it('returns an empty list for a user with nothing saved', async () => {
    expect(await new RecipeStore(memoryStore()).list('u1')).toEqual([]);
  });

  it('saves under a session-scoped key per user', async () => {
    const storage = memoryStore();
    const store = new RecipeStore(storage);

    const saved = await store.save('u1', recipe);

    expect(saved).toEqual([recipe]);
    expect(await store.list('u1')).toEqual([recipe]);
    expect(await store.list('u2')).toEqual([]);
    expect([...storage.data.keys()]).toEqual(['ilia.recipes.u1']);
  });

  it('dedupes by submission id and keeps the newest first', async () => {
    const store = new RecipeStore(memoryStore());
    await store.save('u1', recipe);
    await store.save('u1', { ...recipe, id: 'sub-2' });
    const list = await store.save('u1', { ...recipe, note: 'otra vez' });

    expect(list.map((r) => r.id)).toEqual(['sub-1', 'sub-2']);
    expect(list[0].note).toBe('otra vez');
  });

  it('removes one recipe', async () => {
    const store = new RecipeStore(memoryStore());
    await store.save('u1', recipe);
    expect(await store.remove('u1', 'sub-1')).toEqual([]);
    expect(await store.list('u1')).toEqual([]);
  });

  it('treats corrupt data as empty', async () => {
    const storage = memoryStore({ 'ilia.recipes.u1': '{not json' });
    expect(await new RecipeStore(storage).list('u1')).toEqual([]);
  });

  it('drops entries that do not have the recipe shape', async () => {
    const storage = memoryStore({
      'ilia.recipes.u1': JSON.stringify([recipe, { id: 3 }, null, 'x']),
    });
    expect(await new RecipeStore(storage).list('u1')).toEqual([recipe]);
  });

  it('treats a non-array payload as empty', async () => {
    const storage = memoryStore({ 'ilia.recipes.u1': JSON.stringify({ id: 'sub-1' }) });
    expect(await new RecipeStore(storage).list('u1')).toEqual([]);
  });
});
