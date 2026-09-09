import { describe, expect, it } from 'vitest';

import { canEnrolIn, quotaIsLow, type Entitlements, type Plan } from './entities';

const FREE_PLAN: Plan = {
  id: 'p1',
  code: 'free',
  name: 'Gratuito',
  description: 'Para empezar',
  monthlyEvaluations: 10,
  allowedLevels: ['beginner'],
  canIssueCertificates: false,
  canPostInForum: false,
  priceCents: null,
  isDefault: true,
};

function entitlements(over: Partial<Entitlements> = {}): Entitlements {
  return {
    plan: FREE_PLAN,
    evaluationsUsed: 0,
    evaluationsRemaining: 10,
    canIssueCertificates: false,
    canPostInForum: false,
    allowedLevels: ['beginner'],
    ...over,
  };
}

describe('canEnrolIn', () => {
  it('allows a level the plan covers and refuses one it does not', () => {
    expect(canEnrolIn(entitlements(), 'beginner')).toBe(true);
    expect(canEnrolIn(entitlements(), 'expert')).toBe(false);
  });

  it('is generous when billing is not configured', () => {
    // A misconfiguration must not lock teachers out of the product. Failing
    // closed here would turn a deployment mistake into a total outage.
    expect(canEnrolIn(null, 'expert')).toBe(true);
  });
});

describe('quotaIsLow', () => {
  it('warns only when the quota is nearly gone', () => {
    expect(quotaIsLow(entitlements({ evaluationsRemaining: 10 }))).toBe(false);
    expect(quotaIsLow(entitlements({ evaluationsRemaining: 3 }))).toBe(true);
    expect(quotaIsLow(entitlements({ evaluationsRemaining: 0 }))).toBe(true);
  });

  it('never warns when there is no limit to run out of', () => {
    expect(quotaIsLow(entitlements({ evaluationsRemaining: null }))).toBe(false);
    expect(quotaIsLow(null)).toBe(false);
  });
});
