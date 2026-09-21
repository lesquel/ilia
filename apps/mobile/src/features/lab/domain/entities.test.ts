import { describe, expect, it } from 'vitest';

import {
  EMPTY_ACTIVITY_CHECKS,
  MAX_PROMPT_CHARS,
  canSubmit,
  simulatedEvaluationNotice,
  type Activity,
} from './entities';

function activity(attemptsLeft: number): Activity {
  return {
    id: 'a1',
    title: 'Escribe tu primer prompt',
    statement: 'Pedile una guía de fracciones.',
    requirements: [],
    checks: EMPTY_ACTIVITY_CHECKS,
    courseSlug: 'prompting-para-docentes',
    courseTitle: 'Prompting para docentes',
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

describe('simulatedEvaluationNotice', () => {
  it('warns when the recorded model is the local stub', () => {
    // A teacher who only reads the verdict and the number would treat a stub
    // mark as real. The notice has to exist so the result screen can put it
    // above both.
    expect(simulatedEvaluationNotice('local-stub')).toBe(
      'Estas notas son simuladas. No hay un modelo conectado. No sirven para certificar.',
    );
  });

  it('stays silent for a real provider model', () => {
    expect(simulatedEvaluationNotice('gpt-4o-mini')).toBeNull();
    expect(simulatedEvaluationNotice('claude-sonnet-4-5')).toBeNull();
  });
});
