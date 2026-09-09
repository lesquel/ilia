import { SESSION_SCOPED_PREFIXES, keyValueStore, type KeyValueStore } from '@/core/storage';

/**
 * Prompt drafts, kept on the device (TRD §4.4).
 *
 * Writing a long prompt on a phone keyboard and losing it is a reason not to
 * come back, so this exists. But note what it stores: a teacher's prompt can
 * contain their own pupils' names and marks (TRD §11). On a shared staffroom
 * computer that text would outlive the session — which is why the prefix is
 * registered as session-scoped and wiped at logout, not just at submit.
 */

const [PREFIX] = SESSION_SCOPED_PREFIXES;

export interface Draft {
  text: string;
  savedAt: string;
}

export class DraftStore {
  constructor(private readonly storage: KeyValueStore = keyValueStore) {}

  private key(activityId: string): string {
    return `${PREFIX}${activityId}`;
  }

  async read(activityId: string): Promise<Draft | null> {
    const raw = await this.storage.read(this.key(activityId));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<Draft>;
      if (typeof parsed.text !== 'string' || !parsed.text.trim()) return null;

      return { text: parsed.text, savedAt: parsed.savedAt ?? '' };
    } catch {
      // Corrupt or from an older shape. Dropping it is better than showing a
      // teacher something unreadable in their editor.
      await this.clear(activityId);
      return null;
    }
  }

  async save(activityId: string, text: string): Promise<Draft | null> {
    // An empty draft is not a draft. Storing one would resurrect a blank
    // editor over whatever the teacher expected to find.
    if (!text.trim()) {
      await this.clear(activityId);
      return null;
    }

    const draft: Draft = { text, savedAt: new Date().toISOString() };
    await this.storage.write(this.key(activityId), JSON.stringify(draft));

    return draft;
  }

  async clear(activityId: string): Promise<void> {
    await this.storage.remove(this.key(activityId));
  }
}

export const draftStore = new DraftStore();
