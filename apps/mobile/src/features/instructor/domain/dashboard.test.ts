import { describe, expect, it } from 'vitest';

import {
  averageScore,
  biggestDrop,
  dropSentence,
  instructorGreeting,
  lessonReach,
  pickDashboardCourse,
  quickReasonAppended,
  reviewQueue,
  scoreTone,
} from './dashboard';
import type { AuthoredCourse, CourseInsights, ReviewItem } from './entities';

function item(over: Partial<ReviewItem> = {}): ReviewItem {
  return {
    submissionId: 's1',
    activityTitle: 'Taller',
    studentName: 'María Z.',
    attempt: 1,
    prompt: 'Hazme una hoja',
    submittedAt: null,
    total: 70,
    effectiveTotal: 70,
    passed: true,
    wasOverridden: false,
    ...over,
  };
}

function insights(over: Partial<CourseInsights> = {}): CourseInsights {
  return {
    enrolled: 10,
    finished: 2,
    inProgress: 6,
    notStarted: 2,
    completionRate: 20,
    lessons: [],
    activities: [],
    enrollmentsByDay: [],
    lastActivityAt: null,
    ...over,
  };
}

function lesson(lessonId: string, completed: number) {
  return { lessonId, title: `Lección ${lessonId}`, moduleTitle: 'M1', completed };
}

function course(over: Partial<AuthoredCourse> = {}): AuthoredCourse {
  return {
    id: 'c1',
    slug: 'c1',
    title: 'Curso',
    summary: '',
    description: '',
    level: 'beginner',
    status: 'draft',
    moduleCount: 0,
    lessonCount: 0,
    durationSeconds: 0,
    publishedAt: null,
    publishBlockers: [],
    ...over,
  };
}

describe('instructorGreeting', () => {
  it('greets by first name', () => {
    expect(instructorGreeting('Luis Figueroa')).toBe('Hola, Luis.');
  });

  it('greets without a name when there is none', () => {
    expect(instructorGreeting('   ')).toBe('Hola.');
    expect(instructorGreeting(undefined)).toBe('Hola.');
  });
});

describe('averageScore', () => {
  it('averages the effective totals that exist, rounded', () => {
    expect(
      averageScore([
        item({ effectiveTotal: 70 }),
        item({ effectiveTotal: 81 }),
        item({ effectiveTotal: null }),
      ]),
    ).toBe(76);
  });

  it('is null when nothing has a score', () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([item({ effectiveTotal: null })])).toBeNull();
  });
});

describe('reviewQueue', () => {
  it('puts the failed, uncorrected submissions first and keeps API order otherwise', () => {
    const queue = reviewQueue(
      [
        item({ submissionId: 'a', passed: true }),
        item({ submissionId: 'b', passed: false }),
        item({ submissionId: 'c', passed: true }),
        item({ submissionId: 'd', passed: false }),
      ],
      10,
    );
    expect(queue.map((row) => row.submissionId)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('leaves out what a person already corrected or nothing scored yet', () => {
    const queue = reviewQueue(
      [
        item({ submissionId: 'a', wasOverridden: true }),
        item({ submissionId: 'b', effectiveTotal: null }),
        item({ submissionId: 'c' }),
      ],
      10,
    );
    expect(queue.map((row) => row.submissionId)).toEqual(['c']);
  });

  it('holds to the limit', () => {
    const rows = ['a', 'b', 'c'].map((submissionId) => item({ submissionId }));
    expect(reviewQueue(rows, 2)).toHaveLength(2);
  });
});

describe('scoreTone', () => {
  it('maps a pass to success, a fail to warning and no score to neutral', () => {
    expect(scoreTone(item({ passed: true }))).toBe('success');
    expect(scoreTone(item({ passed: false }))).toBe('warning');
    expect(scoreTone(item({ effectiveTotal: null }))).toBe('neutral');
  });
});

describe('lessonReach', () => {
  it('turns completions into a share of the enrolled, in syllabus order', () => {
    const reach = lessonReach(insights({ lessons: [lesson('1', 10), lesson('2', 5)] }));
    expect(reach).toEqual([
      { key: '1', number: 1, title: 'Lección 1', percent: 100 },
      { key: '2', number: 2, title: 'Lección 2', percent: 50 },
    ]);
  });

  it('is empty with nobody enrolled', () => {
    expect(lessonReach(insights({ enrolled: 0, lessons: [lesson('1', 0)] }))).toEqual([]);
  });
});

describe('biggestDrop', () => {
  it('finds the lesson that loses the most people against the one before', () => {
    const reach = lessonReach(
      insights({
        lessons: [lesson('1', 10), lesson('2', 9), lesson('3', 5), lesson('4', 4)],
      }),
    );
    expect(biggestDrop(reach)).toEqual({ index: 2, number: 3, from: 90, to: 50, drop: 40 });
  });

  it('keeps the first of two equal drops', () => {
    const reach = lessonReach(
      insights({ lessons: [lesson('1', 10), lesson('2', 8), lesson('3', 6)] }),
    );
    expect(biggestDrop(reach)?.number).toBe(2);
  });

  it('is null with fewer than two lessons or no drop at all', () => {
    expect(biggestDrop(lessonReach(insights({ lessons: [lesson('1', 5)] })))).toBeNull();
    expect(
      biggestDrop(lessonReach(insights({ lessons: [lesson('1', 5), lesson('2', 5)] }))),
    ).toBeNull();
  });
});

describe('dropSentence', () => {
  it('says where people stop, in points of the enrolled', () => {
    expect(dropSentence({ index: 2, number: 3, from: 90, to: 50, drop: 40 })).toBe(
      'La lección 3 es donde más gente se detiene: llega el 50 % de los inscritos, 40 puntos menos que a la anterior.',
    );
  });
});

describe('pickDashboardCourse', () => {
  it('keeps the chosen course while it still exists', () => {
    const courses = [course({ id: 'a' }), course({ id: 'b', status: 'published' })];
    expect(pickDashboardCourse(courses, 'a')?.id).toBe('a');
  });

  it('falls back to the first published course, then the first one', () => {
    expect(
      pickDashboardCourse([course({ id: 'a' }), course({ id: 'b', status: 'published' })], null)
        ?.id,
    ).toBe('b');
    expect(pickDashboardCourse([course({ id: 'a' })], 'gone')?.id).toBe('a');
    expect(pickDashboardCourse([], null)).toBeNull();
  });
});

describe('quickReasonAppended', () => {
  it('adds a quick reason on its own sentence', () => {
    expect(quickReasonAppended('', 'Falta el rol.')).toBe('Falta el rol.');
    expect(quickReasonAppended('Buen contexto.', 'Falta el rol.')).toBe(
      'Buen contexto. Falta el rol.',
    );
  });

  it('does not add the same reason twice', () => {
    expect(quickReasonAppended('Falta el rol.', 'Falta el rol.')).toBe('Falta el rol.');
  });
});
