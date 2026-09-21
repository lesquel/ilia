import type { Cohort } from '@/features/admin/domain/entities';

/** The admin form talks to this path. Seed is no longer the only way to open a charla. */
export const ADMIN_COHORTS_PATH = '/admin/cohorts';

export interface CohortDto {
  id: string;
  name: string;
  code: string;
  created_at: string | null;
}

export function createCohortBody(input: { name: string; code: string }): {
  name: string;
  code: string;
} {
  return { name: input.name, code: input.code };
}

export function mapCohortDto(dto: CohortDto): Cohort {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    createdAt: dto.created_at,
  };
}
