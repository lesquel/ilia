import type { Submission } from './entities';

/** The colour role a score is painted in. One meaning each, never decoration. */
export type ScoreBand = 'success' | 'primary' | 'warning';

/** Rounded first, so the colour agrees with the number on screen. */
export function scoreBand(score: number): ScoreBand {
  const shown = Math.round(score);
  if (shown >= 80) return 'success';
  if (shown >= 65) return 'primary';
  return 'warning';
}

export interface ResultBadge {
  label: string;
  role: 'success' | 'warning' | 'neutral';
}

/** The tag beside the verdict. A simulated grade never reads as approved. */
export function resultBadge({
  passed,
  simulated,
  attempt,
  maxAttempts,
}: {
  passed: boolean;
  simulated: boolean;
  attempt: number;
  maxAttempts: number | null;
}): ResultBadge {
  const attemptLabel = maxAttempts ? `intento ${attempt} de ${maxAttempts}` : `intento ${attempt}`;
  if (simulated) return { label: `No cuenta · ${attemptLabel}`, role: 'neutral' };
  return passed
    ? { label: `Aprobado · ${attemptLabel}`, role: 'success' }
    : { label: `Todavía no · ${attemptLabel}`, role: 'warning' };
}

/** The attempt right before `current`, or null on the first one. */
export function previousAttempt(
  submissions: readonly Submission[],
  current: Submission,
): Submission | null {
  let best: Submission | null = null;
  for (const item of submissions) {
    if (item.attempt < current.attempt && (!best || item.attempt > best.attempt)) best = item;
  }
  return best;
}
