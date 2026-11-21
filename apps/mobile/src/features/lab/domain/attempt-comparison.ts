import type { Evaluation, Submission } from './entities';

/** One attempt as the comparison sees it. `evaluation` is null until graded. */
export interface ComparedAttempt {
  submission: Submission;
  evaluation: Evaluation | null;
}

export interface DimensionDelta {
  key: string;
  earlier: number | null;
  later: number | null;
  /** Null when the dimension was not scored on both sides. */
  delta: number | null;
}

export interface AttemptComparison {
  earlierTotal: number | null;
  laterTotal: number | null;
  totalDelta: number | null;
  dimensions: DimensionDelta[];
  /** Failed in the earlier attempt, passed in the later one. */
  fixedRequirements: string[];
  /** Passed in the earlier attempt, failed in the later one. */
  newRequirements: string[];
  /** Both attempts are graded, so every field above is meaningful. */
  complete: boolean;
}

function gradedEvaluation(attempt: ComparedAttempt): Evaluation | null {
  return attempt.submission.status === 'scored' ? attempt.evaluation : null;
}

/**
 * What changed between two attempts at the same activity.
 *
 * Requirement changes are only reported when both sides are graded: a pending
 * attempt has no failures yet, and calling everything "fixed" would be a lie.
 */
export function compareAttempts(
  earlier: ComparedAttempt,
  later: ComparedAttempt,
): AttemptComparison {
  const before = gradedEvaluation(earlier);
  const after = gradedEvaluation(later);

  const earlierTotal = before?.effectiveTotal ?? null;
  const laterTotal = after?.effectiveTotal ?? null;

  const keys: string[] = [];
  for (const score of [...(before?.dimensionScores ?? []), ...(after?.dimensionScores ?? [])]) {
    if (!keys.includes(score.key)) keys.push(score.key);
  }

  const dimensions = keys.map((key) => {
    const a = before?.dimensionScores.find((item) => item.key === key)?.score ?? null;
    const b = after?.dimensionScores.find((item) => item.key === key)?.score ?? null;
    return { key, earlier: a, later: b, delta: a !== null && b !== null ? b - a : null };
  });

  const complete = before !== null && after !== null;
  const failedBefore = before?.checkFailures ?? [];
  const failedAfter = after?.checkFailures ?? [];

  return {
    earlierTotal,
    laterTotal,
    totalDelta: earlierTotal !== null && laterTotal !== null ? laterTotal - earlierTotal : null,
    dimensions,
    fixedRequirements: complete ? failedBefore.filter((item) => !failedAfter.includes(item)) : [],
    newRequirements: complete ? failedAfter.filter((item) => !failedBefore.includes(item)) : [],
    complete,
  };
}

/** Two submissions in attempt order. */
export function orderPair(a: Submission, b: Submission): [Submission, Submission] {
  return a.attempt <= b.attempt ? [a, b] : [b, a];
}

/** Ids of the two latest attempts, earlier first, or null with fewer than two. */
export function defaultComparisonPair(
  submissions: readonly Submission[],
): [string, string] | null {
  if (submissions.length < 2) return null;
  const [latest, previous] = [...submissions].sort((x, y) => y.attempt - x.attempt);
  return [previous.id, latest.id];
}

/**
 * A score change in whole points, the way every other score is shown.
 * Rounding first means a change too small to show reads as "0", not "+0".
 */
export function formatScoreDelta(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
