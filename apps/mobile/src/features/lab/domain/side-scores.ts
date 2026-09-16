/**
 * The two marks the teacher actually compares: the pedido and the hoja.
 *
 * The rubric already splits dimensions into prompt vs result so a lucky
 * answer and a well-written instruction are not the same grade. The result
 * screen has to show that split, not bury it in a single 87.
 */

import type { Activity, DimensionScore, RubricDimension } from '@/features/lab/domain/entities';

export interface SideScores {
  promptScore: number | null;
  resultScore: number | null;
}

export function weightedScoreForKind(
  dimensions: RubricDimension[],
  scores: DimensionScore[],
  kind: RubricDimension['kind'],
): number | null {
  const sideDimensions = dimensions.filter((dimension) => dimension.kind === kind);
  let weightSum = 0;
  let weightedTotal = 0;

  for (const dimension of sideDimensions) {
    const score = scores.find((item) => item.key === dimension.key);
    if (!score) continue;
    weightedTotal += score.score * dimension.weight;
    weightSum += dimension.weight;
  }

  if (weightSum === 0) return null;
  return weightedTotal / weightSum;
}

export function sideScoresFromEvaluation(
  activity: Activity | null,
  scores: DimensionScore[],
): SideScores {
  if (!activity) {
    return { promptScore: null, resultScore: null };
  }

  return {
    promptScore: weightedScoreForKind(activity.dimensions, scores, 'prompt'),
    resultScore: weightedScoreForKind(activity.dimensions, scores, 'result'),
  };
}
