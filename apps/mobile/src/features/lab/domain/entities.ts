/** The Lab domain. Plain TypeScript, shared by all platforms. */

export const MAX_PROMPT_CHARS = 4000;

export type SubmissionStatus = 'pending' | 'running' | 'scored' | 'failed';

export interface RubricDimension {
  key: string;
  name: string;
  description: string;
  kind: 'prompt' | 'result';
  weight: number;
}

export interface Activity {
  id: string;
  title: string;
  statement: string;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsLeft: number;
  dimensions: RubricDimension[];
  /**
   * The objective requirements, stated up front.
   *
   * Showing them is not giving away the answer: these are the things the
   * platform measures mechanically, and a teacher who fails one because nobody
   * told them has been tricked, not taught.
   */
  requirements: string[];
}

export interface Submission {
  id: string;
  activityId: string;
  attempt: number;
  status: SubmissionStatus;
  prompt: string;
  failureReason: string | null;
}

export interface DimensionScore {
  key: string;
  score: number;
  justification: string;
}

export interface Evaluation {
  total: number;
  effectiveTotal: number;
  passed: boolean;
  wasOverridden: boolean;
  rubricVersion: number;
  dimensionScores: DimensionScore[];
  feedback: string;
  suggestion: string;
  checkFailures: string[];
  model: string;
  modelVersion: string;
}

export interface SubmissionResult {
  submission: Submission;
  evaluation: Evaluation | null;
}

/** Still being worked on, so the client keeps polling. */
export function isInFlight(status: SubmissionStatus): boolean {
  return status === 'pending' || status === 'running';
}

export function canSubmit(activity: Activity, prompt: string): boolean {
  const length = prompt.trim().length;
  return activity.attemptsLeft > 0 && length > 0 && length <= MAX_PROMPT_CHARS;
}

/**
 * Whether a score should read as good.
 *
 * The threshold lives in the backend and is what actually counts; this is only
 * for colour, so a teacher can read the result at a glance.
 */
export function scoreTone(score: number): 'strong' | 'fair' | 'weak' {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'fair';
  return 'weak';
}

export function dimensionName(activity: Activity | null, key: string): string {
  return activity?.dimensions.find((item) => item.key === key)?.name ?? key;
}
