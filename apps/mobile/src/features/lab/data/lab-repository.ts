import { HttpClient, httpClient } from '@/core/api/http-client';
import type {
  Activity,
  ActivityChecks,
  Evaluation,
  Submission,
  SubmissionResult,
  SubmissionStatus,
} from '@/features/lab/domain/entities';
import { EMPTY_ACTIVITY_CHECKS } from '@/features/lab/domain/entities';

interface DimensionDto {
  key: string;
  name: string;
  description: string;
  kind: string;
  weight: number;
}

interface ActivityDto {
  id: string;
  title: string;
  statement: string;
  max_attempts: number;
  attempts_used: number;
  attempts_left: number;
  dimensions: DimensionDto[];
  requirements: string[];
  checks?: {
    requires_role: boolean;
    requires_format: boolean;
    min_length: number;
    max_length: number;
    required_terms: string[][];
  };
  course_slug?: string;
  course_title?: string;
}

interface SubmissionDto {
  id: string;
  activity_id: string;
  attempt: number;
  status: string;
  prompt: string;
  failure_reason: string | null;
}

interface EvaluationDto {
  total: number;
  effective_total: number;
  passed: boolean;
  was_overridden: boolean;
  override_reason?: string | null;
  rubric_version: number;
  dimension_scores: { key: string; score: number; justification: string }[];
  feedback: string;
  suggestion: string;
  check_failures: string[];
  model: string;
  model_version: string;
  generated_text?: string;
}

const STATUSES: SubmissionStatus[] = ['pending', 'running', 'scored', 'failed'];

function toStatus(value: string): SubmissionStatus {
  // An unknown status is treated as in-flight rather than finished: the worst
  // case is polling a little longer, instead of telling a teacher their
  // submission is done when it is not.
  return (STATUSES as string[]).includes(value) ? (value as SubmissionStatus) : 'running';
}

function toActivity(dto: ActivityDto): Activity {
  return {
    id: dto.id,
    title: dto.title,
    statement: dto.statement,
    maxAttempts: dto.max_attempts,
    attemptsUsed: dto.attempts_used,
    attemptsLeft: dto.attempts_left,
    dimensions: dto.dimensions.map((item) => ({
      key: item.key,
      name: item.name,
      description: item.description,
      kind: item.kind === 'result' ? 'result' : 'prompt',
      weight: item.weight,
    })),
    requirements: dto.requirements,
    checks: toActivityChecks(dto.checks),
    courseSlug: dto.course_slug ?? '',
    courseTitle: dto.course_title ?? '',
  };
}

function toActivityChecks(dto: ActivityDto['checks']): ActivityChecks {
  if (!dto) return EMPTY_ACTIVITY_CHECKS;
  return {
    requiresRole: dto.requires_role,
    requiresFormat: dto.requires_format,
    minLength: dto.min_length,
    maxLength: dto.max_length,
    requiredTerms: dto.required_terms,
  };
}

function toSubmission(dto: SubmissionDto): Submission {
  return {
    id: dto.id,
    activityId: dto.activity_id,
    attempt: dto.attempt,
    status: toStatus(dto.status),
    prompt: dto.prompt,
    failureReason: dto.failure_reason,
  };
}

function toEvaluation(dto: EvaluationDto): Evaluation {
  return {
    total: dto.total,
    effectiveTotal: dto.effective_total,
    passed: dto.passed,
    wasOverridden: dto.was_overridden,
    overrideReason: dto.override_reason ?? null,
    rubricVersion: dto.rubric_version,
    dimensionScores: dto.dimension_scores,
    feedback: dto.feedback,
    suggestion: dto.suggestion,
    checkFailures: dto.check_failures,
    model: dto.model,
    modelVersion: dto.model_version,
    generatedText: dto.generated_text ?? '',
  };
}

export interface LabRepository {
  activity(activityId: string): Promise<Activity>;
  submit(activityId: string, prompt: string): Promise<Submission>;
  result(submissionId: string): Promise<SubmissionResult>;
  mySubmissions(activityId: string): Promise<Submission[]>;
}

export class HttpLabRepository implements LabRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async activity(activityId: string): Promise<Activity> {
    return toActivity(
      await this.http.get<ActivityDto>(`/lab/activities/${encodeURIComponent(activityId)}`),
    );
  }

  async submit(activityId: string, prompt: string): Promise<Submission> {
    return toSubmission(
      await this.http.post<SubmissionDto>(
        `/lab/activities/${encodeURIComponent(activityId)}/submissions`,
        { prompt },
        // A retry over a dropped connection must not burn a second attempt or a
        // second slice of the teacher's quota.
        { idempotencyKey: `${activityId}:${prompt.length}:${prompt.slice(0, 40)}` },
      ),
    );
  }

  async result(submissionId: string): Promise<SubmissionResult> {
    const dto = await this.http.get<{
      submission: SubmissionDto;
      evaluation: EvaluationDto | null;
    }>(`/lab/submissions/${encodeURIComponent(submissionId)}`);

    return {
      submission: toSubmission(dto.submission),
      evaluation: dto.evaluation ? toEvaluation(dto.evaluation) : null,
    };
  }

  async mySubmissions(activityId: string): Promise<Submission[]> {
    const rows = await this.http.get<SubmissionDto[]>(
      `/lab/activities/${encodeURIComponent(activityId)}/submissions`,
    );
    return rows.map(toSubmission);
  }
}

export const labRepository = new HttpLabRepository();
