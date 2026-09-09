import type { KeyValueStore } from './key-value';

/**
 * Web storage, backed by `localStorage`.
 *
 * Fine for drafts, and deliberately never used for tokens: anything
 * `localStorage` holds, an injected script can read.
 *
 * Every operation is guarded. `localStorage` throws in private-browsing modes
 * and when the quota is full, and a draft failing to save must never take the
 * editor down with it — the teacher would lose the text the feature exists to
 * protect.
 */
export const keyValueStore: KeyValueStore = {
  async read(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  async write(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Quota full or storage blocked. Nothing useful to do, and nothing worth
      // interrupting the teacher for.
    }
  },

  async remove(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Ignored for the same reason.
    }
  },

  async keys(prefix) {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return [];

      return Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(prefix)));
    } catch {
      return [];
    }
  },
};
