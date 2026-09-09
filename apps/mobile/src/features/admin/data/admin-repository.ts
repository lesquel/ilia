import { HttpClient, httpClient } from '@/core/api/http-client';
import type { Role } from '@/features/auth/domain/entities';
import type {
  AuditEntry,
  ManagedUser,
  PlatformOverview,
  UsageReport,
  UsageTotals,
} from '@/features/admin/domain/entities';

interface UsageTotalsDto {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  evaluations: number;
  estimated_cost: number;
  prices_configured: boolean;
}

function toTotals(dto: UsageTotalsDto): UsageTotals {
  return {
    inputTokens: dto.input_tokens,
    outputTokens: dto.output_tokens,
    totalTokens: dto.total_tokens,
    evaluations: dto.evaluations,
    estimatedCost: dto.estimated_cost,
    pricesConfigured: dto.prices_configured,
  };
}

export interface AdminRepository {
  overview(): Promise<PlatformOverview>;
  usage(days?: number): Promise<UsageReport>;
  users(query?: string): Promise<ManagedUser[]>;
  changeRole(userId: string, role: Role): Promise<ManagedUser>;
  audit(): Promise<AuditEntry[]>;
}

export class HttpAdminRepository implements AdminRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async overview(): Promise<PlatformOverview> {
    const dto = await this.http.get<Record<string, number>>('/admin/overview');
    return {
      students: dto.students,
      instructors: dto.instructors,
      admins: dto.admins,
      totalUsers: dto.total_users,
      coursesPublished: dto.courses_published,
      coursesDraft: dto.courses_draft,
      coursesArchived: dto.courses_archived,
      totalCourses: dto.total_courses,
      enrollments: dto.enrollments,
      submissions: dto.submissions,
      certificatesIssued: dto.certificates_issued,
      certificatesRevoked: dto.certificates_revoked,
    };
  }

  async usage(days = 30): Promise<UsageReport> {
    const dto = await this.http.get<{
      period_days: number | null;
      totals: UsageTotalsDto;
      by_user: { user_id: string; full_name: string; email: string; totals: UsageTotalsDto }[];
    }>(`/admin/usage?days=${days}`);

    return {
      periodDays: dto.period_days,
      totals: toTotals(dto.totals),
      byUser: dto.by_user.map((row) => ({
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        totals: toTotals(row.totals),
      })),
    };
  }

  async users(query?: string): Promise<ManagedUser[]> {
    const search = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const rows = await this.http.get<
      { id: string; email: string; full_name: string; role: string; is_active: boolean }[]
    >(`/admin/users${search}`);

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role as Role,
      isActive: row.is_active,
    }));
  }

  async changeRole(userId: string, role: Role): Promise<ManagedUser> {
    const row = await this.http.post<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
    }>(`/admin/users/${userId}/role`, { role });

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role as Role,
      isActive: row.is_active,
    };
  }

  async audit(): Promise<AuditEntry[]> {
    const rows = await this.http.get<
      {
        id: string;
        actor_name: string;
        action: string;
        target_type: string;
        target_id: string | null;
        detail: Record<string, unknown>;
        occurred_at: string | null;
      }[]
    >('/admin/audit');

    return rows.map((row) => ({
      id: row.id,
      actorName: row.actor_name,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      detail: row.detail,
      occurredAt: row.occurred_at,
    }));
  }
}

export const adminRepository = new HttpAdminRepository();
