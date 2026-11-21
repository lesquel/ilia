import { describe, expect, it } from 'vitest';

import type { Evaluation, Submission } from './entities';
import {
  compareAttempts,
  defaultComparisonPair,
  formatScoreDelta,
  orderPair,
} from './attempt-comparison';

function submission(id: string, attempt: number, status: Submission['status'] = 'scored'): Submission {
  return {
    id,
    activityId: 'act-1',
    attempt,
    status,
    prompt: `Pedido ${attempt}`,
    failureReason: null,
    createdAt: null,
  };
}

function evaluation(overrides: Partial<Evaluation>): Evaluation {
  return {
    total: 50,
    effectiveTotal: 50,
    passed: false,
    wasOverridden: false,
    overrideReason: null,
    rubricVersion: 1,
    dimensionScores: [],
    feedback: '',
    suggestion: '',
    checkFailures: [],
    model: 'm',
    modelVersion: '1',
    generatedText: '',
    ...overrides,
  };
}

describe('compareAttempts', () => {
  it('reports total delta, per-dimension deltas, and fixed/new requirements', () => {
    const result = compareAttempts(
      {
        submission: submission('s1', 1),
        evaluation: evaluation({
          effectiveTotal: 40,
          dimensionScores: [
            { key: 'claridad', score: 30, justification: '' },
            { key: 'contexto', score: 60, justification: '' },
            { key: 'solo-antes', score: 10, justification: '' },
          ],
          checkFailures: ['Falta el rol', 'Muy corto'],
        }),
      },
      {
        submission: submission('s2', 2),
        evaluation: evaluation({
          effectiveTotal: 72,
          dimensionScores: [
            { key: 'claridad', score: 80, justification: '' },
            { key: 'contexto', score: 55, justification: '' },
            { key: 'solo-despues', score: 90, justification: '' },
          ],
          checkFailures: ['Muy corto', 'Falta el formato'],
        }),
      },
    );

    expect(result).toEqual({
      earlierTotal: 40,
      laterTotal: 72,
      totalDelta: 32,
      dimensions: [
        { key: 'claridad', earlier: 30, later: 80, delta: 50 },
        { key: 'contexto', earlier: 60, later: 55, delta: -5 },
        { key: 'solo-antes', earlier: 10, later: null, delta: null },
        { key: 'solo-despues', earlier: null, later: 90, delta: null },
      ],
      fixedRequirements: ['Falta el rol'],
      newRequirements: ['Falta el formato'],
      complete: true,
    });
  });

  it('marks the comparison incomplete when an evaluation is missing or pending', () => {
    const result = compareAttempts(
      {
        submission: submission('s1', 1),
        evaluation: evaluation({
          effectiveTotal: 40,
          dimensionScores: [{ key: 'claridad', score: 30, justification: '' }],
          checkFailures: ['Falta el rol'],
        }),
      },
      { submission: submission('s2', 2, 'running'), evaluation: null },
    );

    expect(result).toEqual({
      earlierTotal: 40,
      laterTotal: null,
      totalDelta: null,
      dimensions: [{ key: 'claridad', earlier: 30, later: null, delta: null }],
      fixedRequirements: [],
      newRequirements: [],
      complete: false,
    });
  });

  it('treats an unscored submission as missing even if an evaluation object exists', () => {
    const result = compareAttempts(
      { submission: submission('s1', 1, 'failed'), evaluation: evaluation({ effectiveTotal: 0 }) },
      { submission: submission('s2', 2), evaluation: evaluation({ effectiveTotal: 70 }) },
    );

    expect(result.earlierTotal).toBeNull();
    expect(result.laterTotal).toBe(70);
    expect(result.totalDelta).toBeNull();
    expect(result.complete).toBe(false);
  });
});

describe('orderPair', () => {
  it('puts the lower attempt number first', () => {
    const [earlier, later] = orderPair(submission('b', 3), submission('a', 1));
    expect(earlier.id).toBe('a');
    expect(later.id).toBe('b');
  });
});

describe('defaultComparisonPair', () => {
  it('picks the two latest attempts, earlier first', () => {
    expect(
      defaultComparisonPair([submission('s1', 1), submission('s3', 3), submission('s2', 2)]),
    ).toEqual(['s2', 's3']);
  });

  it('returns null with fewer than two attempts', () => {
    expect(defaultComparisonPair([submission('s1', 1)])).toBeNull();
    expect(defaultComparisonPair([])).toBeNull();
  });
});

describe('formatScoreDelta', () => {
  it('rounds to whole points like the rest of the scores', () => {
    expect(formatScoreDelta(2.480000000000004)).toBe('+2');
    expect(formatScoreDelta(12.07843137254902)).toBe('+12');
    expect(formatScoreDelta(-30.843137254901954)).toBe('-31');
  });

  it('shows no sign when the rounded change is zero', () => {
    expect(formatScoreDelta(0)).toBe('0');
    expect(formatScoreDelta(-0.3)).toBe('0');
    expect(formatScoreDelta(0.4)).toBe('0');
  });
});
