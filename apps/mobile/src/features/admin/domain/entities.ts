import type { Role } from '@/features/auth/domain/entities';

/** Admin domain. Plain TypeScript, shared by all platforms. */

export interface PlatformOverview {
  students: number;
  instructors: number;
  admins: number;
  totalUsers: number;
  coursesPublished: number;
  coursesDraft: number;
  coursesArchived: number;
  totalCourses: number;
  enrollments: number;
  submissions: number;
  certificatesIssued: number;
  certificatesRevoked: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  evaluations: number;
  estimatedCost: number;
  /**
   * Whether the cost figure means anything.
   *
   * A zero that means "no prices configured" must never be shown as a zero that
   * means "free" — the provider is not chosen yet.
   */
  pricesConfigured: boolean;
}

export interface UsageByUser {
  userId: string;
  fullName: string;
  email: string;
  totals: UsageTotals;
}

export interface UsageReport {
  periodDays: number | null;
  totals: UsageTotals;
  byUser: UsageByUser[];
}

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: Record<string, unknown>;
  occurredAt: string | null;
}

export interface Cohort {
  id: string;
  name: string;
  code: string;
  createdAt: string | null;
}

/**
 * How the admin cohort list should look.
 *
 * Missing data defaults to `[]` in the hook. Without this distinction, a
 * loading spinner or a failed GET would read as "there are no charlas".
 */
export type CohortListAppearance = 'loading' | 'error' | 'empty' | 'items';

export function cohortListAppearance(state: {
  isLoading: boolean;
  error: unknown;
  isSuccess: boolean;
  itemCount: number;
}): CohortListAppearance {
  if (state.error && !state.isSuccess) return 'error';
  if (state.isLoading || !state.isSuccess) return 'loading';
  if (state.itemCount === 0) return 'empty';
  return 'items';
}

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Estudiante',
  instructor: 'Instructor',
  admin: 'Administrador',
};

export const ACTION_LABELS: Record<string, string> = {
  role_changed: 'Cambio de rol',
  certificate_revoked: 'Certificado revocado',
  course_published: 'Curso publicado',
  course_unpublished: 'Curso retirado',
};

/** Thousands separators, because seven-digit token counts are unreadable raw. */
export function formatTokens(value: number): string {
  return value.toLocaleString('es-EC');
}

export interface FunnelStep {
  key: 'enrollments' | 'submissions' | 'certificates';
  label: string;
  /** The word for the count in a sentence: [one, many]. */
  noun: [string, string];
  value: number;
  /** How much of its track the bar fills, 0–100, against the largest step. */
  share: number;
}

/**
 * Enrolments, submissions and certificates as bars on one scale.
 *
 * Empty when all three are zero: three empty tracks would look like a chart
 * that failed to load, and the screen says it in a sentence instead.
 */
export function certificationFunnel(
  overview: Pick<PlatformOverview, 'enrollments' | 'submissions' | 'certificatesIssued'>,
): FunnelStep[] {
  const figures: Omit<FunnelStep, 'share'>[] = [
    {
      key: 'enrollments',
      label: 'Inscripciones',
      noun: ['inscripción', 'inscripciones'],
      value: overview.enrollments,
    },
    {
      key: 'submissions',
      label: 'Entregas',
      noun: ['entrega', 'entregas'],
      value: overview.submissions,
    },
    {
      key: 'certificates',
      label: 'Certificados',
      noun: ['certificado', 'certificados'],
      value: overview.certificatesIssued,
    },
  ];

  const largest = Math.max(...figures.map((figure) => figure.value));
  if (largest <= 0) return [];

  return figures.map((figure) => ({
    ...figure,
    // A count that exists never rounds down to an empty bar.
    share: figure.value > 0 ? Math.max(1, Math.round((figure.value * 100) / largest)) : 0,
  }));
}

/** The funnel's numbers as words, for a reader who cannot see the bars. */
export function funnelSentence(steps: FunnelStep[]): string {
  const parts = steps.map((step) => `${step.value} ${step.noun[step.value === 1 ? 0 : 1]}`);
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}
