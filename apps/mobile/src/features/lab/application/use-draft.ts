import { useCallback, useEffect, useRef, useState } from 'react';

import { draftStore, type DraftStore } from '@/features/lab/data/draft-store';

/** How long to wait after the last keystroke before writing. */
const DEBOUNCE_MS = 800;

export type DraftStatus = 'idle' | 'saving' | 'saved';

/**
 * Autosaves the prompt editor (TRD §4.4).
 *
 * Debounced rather than saved on every keystroke: a teacher typing a 300-word
 * prompt would otherwise hit storage 1500 times, and on a low-end Android phone
 * that is felt.
 */
export function useDraft(activityId: string, store: DraftStore = draftStore) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<DraftStatus>('idle');
  const [restored, setRestored] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a restore landing after the teacher has already started
  // typing — which would overwrite their new text with the old draft.
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const draft = await store.read(activityId);

      if (cancelled || dirty.current) {
        setIsReady(true);
        return;
      }

      if (draft) {
        setText(draft.text);
        setRestored(true);
        setStatus('saved');
      }

      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, store]);

  const update = useCallback(
    (next: string) => {
      dirty.current = true;
      setText(next);
      setStatus('saving');

      if (timer.current) clearTimeout(timer.current);

      timer.current = setTimeout(() => {
        void store.save(activityId, next).then(() => setStatus(next.trim() ? 'saved' : 'idle'));
      }, DEBOUNCE_MS);
    },
    [activityId, store],
  );

  const clear = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setText('');
    setStatus('idle');
    setRestored(false);
    await store.clear(activityId);
  }, [activityId, store]);

  // The latest text, readable from the unmount cleanup without making that
  // effect depend on `text` — which would re-register it on every keystroke.
  const latest = useRef(text);
  latest.current = text;

  // On unmount, flush rather than cancel. Leaving the screen right after typing
  // is exactly when a draft is most worth having, and dropping the pending
  // write there would lose the last thing the teacher wrote.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) void store.save(activityId, latest.current);
    },
    [activityId, store],
  );

  return { text, setText: update, status, restored, isReady, clear };
}
