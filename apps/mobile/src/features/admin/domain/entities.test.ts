import { describe, expect, it } from 'vitest';

import { certificationFunnel, cohortListAppearance, funnelSentence } from './entities';

describe('cohortListAppearance', () => {
  it('does not treat a failed list as an empty list', () => {
    expect(
      cohortListAppearance({
        isLoading: false,
        error: new Error('network'),
        isSuccess: false,
        itemCount: 0,
      }),
    ).toBe('error');
  });

  it('does not treat the initial load as an empty list', () => {
    expect(
      cohortListAppearance({
        isLoading: true,
        error: null,
        isSuccess: false,
        itemCount: 0,
      }),
    ).toBe('loading');
  });

  it('says empty only after a successful response with zero items', () => {
    expect(
      cohortListAppearance({
        isLoading: false,
        error: null,
        isSuccess: true,
        itemCount: 0,
      }),
    ).toBe('empty');
  });

  it('shows items when the list arrived', () => {
    expect(
      cohortListAppearance({
        isLoading: false,
        error: null,
        isSuccess: true,
        itemCount: 1,
      }),
    ).toBe('items');
  });
});

describe('certificationFunnel', () => {
  it('measures every bar against the largest of the three figures', () => {
    const steps = certificationFunnel({ enrollments: 8, submissions: 4, certificatesIssued: 2 });

    expect(steps.map((step) => [step.label, step.value, step.share])).toEqual([
      ['Inscripciones', 8, 100],
      ['Entregas', 4, 50],
      ['Certificados', 2, 25],
    ]);
  });

  it('scales to the largest figure even when it is not the first', () => {
    const steps = certificationFunnel({ enrollments: 2, submissions: 10, certificatesIssued: 0 });

    expect(steps.map((step) => step.share)).toEqual([20, 100, 0]);
  });

  it('keeps a small count visible instead of rounding it to an empty bar', () => {
    const steps = certificationFunnel({ enrollments: 1000, submissions: 1, certificatesIssued: 0 });

    expect(steps[1]?.share).toBeGreaterThan(0);
    expect(steps[2]?.share).toBe(0);
  });

  it('has nothing to draw when all three figures are zero', () => {
    expect(
      certificationFunnel({ enrollments: 0, submissions: 0, certificatesIssued: 0 }),
    ).toEqual([]);
  });
});

describe('funnelSentence', () => {
  it('states the three numbers, in the singular where there is one', () => {
    const steps = certificationFunnel({ enrollments: 2, submissions: 1, certificatesIssued: 0 });

    expect(funnelSentence(steps)).toBe('2 inscripciones, 1 entrega y 0 certificados');
  });
});
