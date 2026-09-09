import { keyValueStore } from './key-value-store';

/**
 * Key prefixes holding data that belongs to whoever is logged in right now.
 *
 * Declared here rather than in each feature, and cleared unconditionally at
 * logout. A registry that features opt into at import time would look tidier
 * and would not work: on a shared staffroom computer someone can log in and out
 * without ever opening the lab, so that module would never load, and the
 * previous teacher's drafts — which can name their pupils (TRD §11) — would
 * still be sitting there for the next one.
 */
export const SESSION_SCOPED_PREFIXES = [
  /** Prompt drafts. See `features/lab/data/draft-store`. */
  'ilia.draft.',
] as const;

/** Wipe every session-scoped key. Called at logout. */
export async function clearSessionScopedStorage(): Promise<void> {
  for (const prefix of SESSION_SCOPED_PREFIXES) {
    const keys = await keyValueStore.keys(prefix);
    await Promise.all(keys.map((key) => keyValueStore.remove(key)));
  }
}
