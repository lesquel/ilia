import { describe, expect, it } from 'vitest';

import {
  AUDIT_VISIBLE_ROWS,
  auditFooter,
  certificationFunnel,
  cohortListAppearance,
  funnelSentence,
  overviewKpis,
  roleChangeNeedsConfirmation,
  roleChangeQuestion,
  roleTone,
} from './entities';

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

describe('roleChangeNeedsConfirmation', () => {
  it('asks before moving a person to a different role', () => {
    expect(roleChangeNeedsConfirmation('student', 'instructor')).toBe(true);
    expect(roleChangeNeedsConfirmation('admin', 'student')).toBe(true);
  });

  it('has nothing to confirm when the person already holds the role', () => {
    expect(roleChangeNeedsConfirmation('instructor', 'instructor')).toBe(false);
  });
});

describe('roleChangeQuestion', () => {
  it('names the person and both roles as the panel labels them', () => {
    expect(
      roleChangeQuestion(
        { fullName: 'Ana Pérez', email: 'ana@example.com', role: 'student' },
        'instructor',
      ),
    ).toBe('¿Cambiar a Ana Pérez de Estudiante a Instructor?');
  });

  it('falls back to the email when the account has no name', () => {
    expect(
      roleChangeQuestion({ fullName: '  ', email: 'ana@example.com', role: 'admin' }, 'student'),
    ).toBe('¿Cambiar a ana@example.com de Administrador a Estudiante?');
  });
});

describe('auditFooter', () => {
  it('reports the rows on screen, not the rows that were loaded', () => {
    expect(auditFooter(AUDIT_VISIBLE_ROWS, 137)).toBe(
      `Mostrando las ${AUDIT_VISIBLE_ROWS} más recientes de 137.`,
    );
  });

  it('agrees in number when a single row is on screen', () => {
    expect(auditFooter(1, 3)).toBe('Mostrando la más reciente de 3.');
  });

  it('says nothing when every recorded action is on screen', () => {
    expect(auditFooter(5, 5)).toBeNull();
    expect(auditFooter(0, 0)).toBeNull();
  });
});

describe('roleTone', () => {
  it('gives each role its own colour role', () => {
    expect(roleTone('student')).toBe('accent');
    expect(roleTone('instructor')).toBe('success');
    expect(roleTone('admin')).toBe('ink');
  });
});

describe('overviewKpis', () => {
  it('leads with the five headline figures, each with its hint', () => {
    const kpis = overviewKpis({
      students: 40,
      instructors: 3,
      admins: 1,
      totalUsers: 44,
      coursesPublished: 9,
      coursesDraft: 2,
      coursesArchived: 1,
      totalCourses: 12,
      enrollments: 120,
      submissions: 300,
      certificatesIssued: 18,
      certificatesRevoked: 1,
    });
    expect(kpis).toEqual([
      { key: 'users', label: 'Cuentas', value: 44, hint: '40 docentes · 3 instructores' },
      { key: 'enrollments', label: 'Inscripciones', value: 120, hint: 'en todos los cursos' },
      { key: 'submissions', label: 'Entregas', value: 300, hint: 'evaluadas por Lía' },
      { key: 'certificates', label: 'Certificados', value: 18, hint: '1 revocado' },
      { key: 'courses', label: 'Cursos publicados', value: 9, hint: '2 borradores' },
    ]);
  });

  it('uses the singular for one', () => {
    const kpis = overviewKpis({
      students: 1,
      instructors: 1,
      admins: 1,
      totalUsers: 3,
      coursesPublished: 1,
      coursesDraft: 1,
      coursesArchived: 0,
      totalCourses: 2,
      enrollments: 1,
      submissions: 1,
      certificatesIssued: 0,
      certificatesRevoked: 0,
    });
    expect(kpis.map((kpi) => kpi.hint)).toEqual([
      '1 docente · 1 instructor',
      'en todos los cursos',
      'evaluadas por Lía',
      '0 revocados',
      '1 borrador',
    ]);
  });
});
