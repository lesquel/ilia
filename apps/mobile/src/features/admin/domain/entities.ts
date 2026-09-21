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
