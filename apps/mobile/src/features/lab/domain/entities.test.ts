import { describe, expect, it } from 'vitest';

import { MAX_PROMPT_CHARS, canSubmit, type Activity } from './entities';

function activity(attemptsLeft: number): Activity {
  return {
    id: 'a1',
    title: 'Escribí tu primer prompt',
    statement: 'Pedile una guía de fracciones.',
    requirements: [],
    dimensions: [],
    attemptsUsed: 3 - attemptsLeft,
    attemptsLeft,
    maxAttempts: 3,
  };
}

describe('canSubmit', () => {
  it('accepts a real prompt while attempts remain', () => {
    expect(canSubmit(activity(3), 'Actuá como docente de matemática')).toBe(true);
  });

  it('refuses once the attempts are gone', () => {
    expect(canSubmit(activity(0), 'Actuá como docente de matemática')).toBe(false);
  });

  it('treats whitespace as empty', () => {
    // Otherwise a stray space would spend one of three attempts on nothing.
    expect(canSubmit(activity(3), '   \n  ')).toBe(false);
    expect(canSubmit(activity(3), '')).toBe(false);
  });

  it('refuses a prompt past the limit the API enforces', () => {
    expect(canSubmit(activity(3), 'a'.repeat(MAX_PROMPT_CHARS))).toBe(true);
    expect(canSubmit(activity(3), 'a'.repeat(MAX_PROMPT_CHARS + 1))).toBe(false);
  });
});
