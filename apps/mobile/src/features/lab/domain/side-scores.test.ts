import { describe, expect, it } from 'vitest';

import { EMPTY_ACTIVITY_CHECKS, type Activity } from './entities';
import { sideScoresFromEvaluation } from './side-scores';

const activity: Activity = {
  id: 'a1',
  title: 'El prompt de tu próxima clase',
  statement: 'Escribe el pedido.',
  maxAttempts: 3,
  attemptsUsed: 1,
  attemptsLeft: 2,
  requirements: [],
  checks: EMPTY_ACTIVITY_CHECKS,
  courseSlug: 'prompting-para-docentes',
  courseTitle: 'Prompting para docentes',
  dimensions: [
    { key: 'claridad', name: 'Claridad', description: '', kind: 'prompt', weight: 20 },
    { key: 'contexto', name: 'Contexto', description: '', kind: 'prompt', weight: 20 },
    { key: 'resultado', name: 'Calidad del resultado', description: '', kind: 'result', weight: 30 },
  ],
};

describe('sideScoresFromEvaluation', () => {
  it('splits the prompt mark from the sheet mark', () => {
    const sides = sideScoresFromEvaluation(activity, [
      { key: 'claridad', score: 80, justification: 'clara' },
      { key: 'contexto', score: 60, justification: 'falta aula' },
      { key: 'resultado', score: 90, justification: 'la hoja sirve' },
    ]);

    expect(sides.promptScore).toBe(70);
    expect(sides.resultScore).toBe(90);
  });

  it('returns null for a side the rubric does not measure', () => {
    const onlyPrompt: Activity = {
      ...activity,
      dimensions: activity.dimensions.filter((dimension) => dimension.kind === 'prompt'),
    };

    expect(
      sideScoresFromEvaluation(onlyPrompt, [
        { key: 'claridad', score: 80, justification: 'clara' },
        { key: 'contexto', score: 60, justification: 'falta aula' },
      ]).resultScore,
    ).toBeNull();
  });
});
