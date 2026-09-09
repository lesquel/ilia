/**
 * A small key-value store, for things that are not secrets.
 *
 * Separate from `token-store` on purpose: tokens go in the OS secure store and
 * must never be written on web, while drafts are the opposite — they are the
 * teacher's own text, and losing them is the failure mode that matters.
 */
export interface KeyValueStore {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Every key under a prefix. Used to clear a whole namespace at logout. */
  keys(prefix: string): Promise<string[]>;
}
