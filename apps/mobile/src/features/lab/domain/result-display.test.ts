import { describe, expect, it } from 'vitest';

import type { Submission } from './entities';
import { previousAttempt, resultBadge, scoreBand } from './result-display';

function submission(id: string, attempt: number): Submission {
  return {
    id,
    activityId: 'act',
    attempt,
    status: 'scored',
    prompt: '',
    failureReason: null,
    createdAt: null,
  };
}

describe('scoreBand', () => {
  it('maps a score to a colour role: strong, on track, needs work', () => {
    expect(scoreBand(80)).toBe('success');
    expect(scoreBand(95)).toBe('success');
    expect(scoreBand(79.6)).toBe('success');
    expect(scoreBand(65)).toBe('primary');
    expect(scoreBand(79)).toBe('primary');
    expect(scoreBand(64)).toBe('warning');
    expect(scoreBand(0)).toBe('warning');
  });
});

describe('resultBadge', () => {
  it('says approved with the attempt count', () => {
    expect(resultBadge({ passed: true, simulated: false, attempt: 2, maxAttempts: 3 })).toEqual({
      label: 'Aprobado · intento 2 de 3',
      role: 'success',
    });
  });

  it('says not yet when it did not pass', () => {
    expect(resultBadge({ passed: false, simulated: false, attempt: 1, maxAttempts: 3 })).toEqual({
      label: 'Todavía no · intento 1 de 3',
      role: 'warning',
    });
  });

  it('never says approved for a simulated grade', () => {
    expect(resultBadge({ passed: true, simulated: true, attempt: 1, maxAttempts: 3 })).toEqual({
      label: 'No cuenta · intento 1 de 3',
      role: 'neutral',
    });
  });

  it('drops the total when the activity is not known yet', () => {
    expect(resultBadge({ passed: true, simulated: false, attempt: 2, maxAttempts: null }).label).toBe(
      'Aprobado · intento 2',
    );
  });
});

describe('previousAttempt', () => {
  it('returns the attempt right before the current one', () => {
    const all = [submission('c', 3), submission('a', 1), submission('b', 2)];
    expect(previousAttempt(all, all[0])?.id).toBe('b');
  });

  it('returns null on the first attempt', () => {
    const all = [submission('a', 1), submission('b', 2)];
    expect(previousAttempt(all, all[0])).toBeNull();
  });

  it('looks back from an older attempt, not from the latest', () => {
    const all = [submission('a', 1), submission('b', 2), submission('c', 3)];
    expect(previousAttempt(all, all[1])?.id).toBe('a');
  });
});
