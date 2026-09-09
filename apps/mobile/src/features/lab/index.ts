/** Public entry point of the lab feature. */

export { MAX_PROMPT_CHARS, canSubmit, isInFlight, scoreTone } from './domain/entities';
export type {
  Activity,
  DimensionScore,
  Evaluation,
  RubricDimension,
  Submission,
  SubmissionResult,
  SubmissionStatus,
} from './domain/entities';
export {
  labKeys,
  useActivity,
  useMySubmissions,
  useSubmissionResult,
  useSubmitPrompt,
} from './application/use-lab';
export { AttemptHistory } from './presentation/attempt-history';
