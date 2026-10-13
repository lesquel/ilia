import { describe, expect, it } from 'vitest';

import {
  canEnrolIn,
  levelsLabel,
  priceLine,
  quotaIsLow,
  type Entitlements,
  type Plan,
} from './entities';

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

describe('levelsLabel', () => {
  it('lists the levels in learning order, whatever order the plan stores them in', () => {
    expect(levelsLabel(['expert', 'beginner', 'intermediate'])).toBe(
      'Básico, Intermedio, Experto',
    );
  });
});

describe('priceLine', () => {
  it('does not repeat a price the plan name already says', () => {
    expect(priceLine({ ...FREE_PLAN, name: 'Gratis', priceCents: 0 })).toBeNull();
    expect(priceLine({ ...FREE_PLAN, name: ' gratis ', priceCents: 0 })).toBeNull();
  });

  it('states the price when the name does not', () => {
    expect(priceLine({ ...FREE_PLAN, name: 'Gratuito', priceCents: 0 })).toBe('Gratis');
    expect(priceLine({ ...FREE_PLAN, name: 'Completo', priceCents: 990 })).toBe(
      'USD 9.90 / mes',
    );
    expect(priceLine({ ...FREE_PLAN, name: 'Completo', priceCents: null })).toBe(
      'Precio a definir',
    );
  });
});
