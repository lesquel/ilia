import { LEVEL_LABELS, type Level } from '@/features/catalog/domain/entities';

/** Billing domain. Plain TypeScript, shared by all platforms. */

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  /** Null means unlimited — which is not the same as zero. */
  monthlyEvaluations: number | null;
  allowedLevels: Level[];
  canIssueCertificates: boolean;
  canPostInForum: boolean;
  /** Null while pricing is undecided. The UI says so rather than inventing one. */
  priceCents: number | null;
  isDefault: boolean;
}

export interface Entitlements {
  plan: Plan;
  evaluationsUsed: number;
  evaluationsRemaining: number | null;
  canIssueCertificates: boolean;
  canPostInForum: boolean;
  allowedLevels: Level[];
}

export function formatPrice(priceCents: number | null): string {
  if (priceCents === null) return 'Precio a definir';
  if (priceCents === 0) return 'Gratis';
  return `USD ${(priceCents / 100).toFixed(2)} / mes`;
}

export function formatQuota(monthly: number | null): string {
  if (monthly === null) return 'Evaluaciones sin límite';
  if (monthly === 0) return 'Sin evaluaciones';
  return `${monthly} evaluaciones por mes`;
}

export function levelsLabel(levels: Level[]): string {
  return levels.map((level) => LEVEL_LABELS[level]).join(', ');
}

export function canEnrolIn(entitlements: Entitlements | null, level: Level): boolean {
  // Unknown entitlements mean billing is not configured, which is generous by
  // design: a misconfiguration should not lock teachers out.
  return entitlements === null || entitlements.allowedLevels.includes(level);
}

/** Whether it is worth warning the teacher that the quota is nearly gone. */
export function quotaIsLow(entitlements: Entitlements | null): boolean {
  if (!entitlements || entitlements.evaluationsRemaining === null) return false;
  return entitlements.evaluationsRemaining <= 3;
}
