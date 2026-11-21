import { SESSION_SCOPED_PREFIXES, keyValueStore, type KeyValueStore } from '@/core/storage';

import { addRecipe, removeRecipe, type Recipe } from '../domain/recipe';

/**
 * "Mi recetario", kept on the device per signed-in user.
 *
 * Local on purpose: no endpoint and no migration on the live database, and not
 * synced across devices. A saved prompt is the teacher's own text and can name
 * her pupils (TRD §11), so the prefix is session-scoped and wiped at logout.
 */
const PREFIX = SESSION_SCOPED_PREFIXES.find((prefix) => prefix === 'ilia.recipes.') ?? 'ilia.recipes.';

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.prompt === 'string' &&
    typeof item.activityTitle === 'string' &&
    typeof item.score === 'number' &&
    typeof item.savedAt === 'string' &&
    (item.note === undefined || typeof item.note === 'string')
  );
}

export class RecipeStore {
  constructor(private readonly storage: KeyValueStore = keyValueStore) {}

  private key(userId: string): string {
    return `${PREFIX}${userId}`;
  }

  async list(userId: string): Promise<Recipe[]> {
    const raw = await this.storage.read(this.key(userId));
    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      // Corrupt or from an older shape: show what is readable, never crash.
      return Array.isArray(parsed) ? parsed.filter(isRecipe) : [];
    } catch {
      return [];
    }
  }

  async save(userId: string, recipe: Recipe): Promise<Recipe[]> {
    const next = addRecipe(await this.list(userId), recipe);
    await this.storage.write(this.key(userId), JSON.stringify(next));
    return next;
  }

  async remove(userId: string, id: string): Promise<Recipe[]> {
    const next = removeRecipe(await this.list(userId), id);
    await this.storage.write(this.key(userId), JSON.stringify(next));
    return next;
  }
}

export const recipeStore = new RecipeStore();
