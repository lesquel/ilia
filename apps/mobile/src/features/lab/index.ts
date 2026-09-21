/** Public entry point of the lab feature. */

export { MAX_PROMPT_CHARS, canSubmit, isInFlight, scoreTone } from './domain/entities';
export type {
  Activity,
  ActivityChecks,
  DimensionScore,
  Evaluation,
  RubricDimension,
  Submission,
  SubmissionResult,
  SubmissionStatus,
} from './domain/entities';
export { EMPTY_ACTIVITY_CHECKS } from './domain/entities';
export {
  labKeys,
  useActivity,
  useMySubmissions,
  useSubmissionResult,
  useSubmitPrompt,
} from './application/use-lab';
export { globalSubmissionKeys, useGlobalSubmissionHistory } from './application/use-global-submissions';
export { AttemptHistory } from './presentation/attempt-history';
export { EvaluationsScreen } from './presentation/evaluations-screen';
