import { HttpClient, httpClient } from '@/core/api/http-client';
import type { Level } from '@/features/catalog/domain/entities';
import type { Entitlements, Plan } from '@/features/billing/domain/entities';

interface PlanDto {
  id: string;
  code: string;
  name: string;
  description: string;
  monthly_evaluations: number | null;
  allowed_levels: string[];
  can_issue_certificates: boolean;
  can_post_in_forum: boolean;
  price_cents: number | null;
  is_default: boolean;
}

function toPlan(dto: PlanDto): Plan {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    monthlyEvaluations: dto.monthly_evaluations,
    allowedLevels: dto.allowed_levels as Level[],
    canIssueCertificates: dto.can_issue_certificates,
    canPostInForum: dto.can_post_in_forum,
    priceCents: dto.price_cents,
    isDefault: dto.is_default,
  };
}

export interface BillingRepository {
  plans(): Promise<Plan[]>;
  me(): Promise<Entitlements>;
}

export class HttpBillingRepository implements BillingRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async plans(): Promise<Plan[]> {
    const rows = await this.http.get<PlanDto[]>('/billing/plans');
    return rows.map(toPlan);
  }

  async me(): Promise<Entitlements> {
    const dto = await this.http.get<{
      plan: PlanDto;
      evaluations_used: number;
      evaluations_remaining: number | null;
      can_issue_certificates: boolean;
      can_post_in_forum: boolean;
      allowed_levels: string[];
    }>('/billing/me');

    return {
      plan: toPlan(dto.plan),
      evaluationsUsed: dto.evaluations_used,
      evaluationsRemaining: dto.evaluations_remaining,
      canIssueCertificates: dto.can_issue_certificates,
      canPostInForum: dto.can_post_in_forum,
      allowedLevels: dto.allowed_levels as Level[],
    };
  }
}

export const billingRepository = new HttpBillingRepository();
