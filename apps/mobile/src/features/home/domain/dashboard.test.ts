import { describe, expect, it } from 'vitest';

import type { CourseSummary, Module } from '@/features/catalog/domain/entities';
import type { Certificate } from '@/features/certificates/domain/entities';
import type { CourseProgress, EnrolledCourse } from '@/features/enrollment/domain/entities';
import type { Submission } from '@/features/lab/domain/entities';
import type { SubmissionHistoryItem } from '@/features/lab/domain/submission-history';

import {
  courseCardFor,
  courseInitial,
  courseToContinue,
  greetingFor,
  heroFor,
  labDeltaLine,
  latestGradedAttempt,
  liaLineFor,
  nearestCertificate,
  todayLabel,
} from './dashboard';

function progress(overrides: Partial<CourseProgress> = {}): CourseProgress {
  return {
    totalLessons: 6,
    completedLessons: 2,
    percentage: 33.3,
    isComplete: false,
    completedLessonIds: ['l1', 'l2'],
    passedActivityIds: [],
    pendingActivityCount: 1,
    isFinished: false,
    nextLesson: {
      lessonId: 'l3',
      lessonTitle: 'Un cambio sin empezar de cero',
      moduleId: 'm1',
      moduleTitle: 'Primeros pedidos',
    },
    ...overrides,
  };
}

function course(id: string, title = `Curso ${id}`): CourseSummary {
  return {
    id,
    slug: `slug-${id}`,
    title,
    summary: '',
    level: 'beginner',
    instructorName: 'Ana',
    lessonCount: 6,
    durationSeconds: 0,
  };
}

function enrolled(id: string, p: Partial<CourseProgress> = {}, title?: string): EnrolledCourse {
  return { course: course(id, title), enrolledAt: null, progress: progress(p) };
}

const modules: Module[] = [
  {
    id: 'm1',
    title: 'Primeros pedidos',
    position: 1,
    lessons: [
      { id: 'l1', title: 'Uno', kind: 'video', position: 1, durationSeconds: 60, hasMedia: true },
      { id: 'l2', title: 'Dos', kind: 'video', position: 2, durationSeconds: 60, hasMedia: true },
      {
        id: 'l3',
        title: 'Un cambio sin empezar de cero',
        kind: 'video',
        position: 3,
        durationSeconds: 60,
        hasMedia: true,
      },
    ],
    activities: [{ id: 'a1', title: 'Tu primera hoja', maxAttempts: 3 }],
  },
  {
    id: 'm2',
    title: 'Ajustes',
    position: 2,
    lessons: [
      { id: 'l4', title: 'Cuatro', kind: 'video', position: 1, durationSeconds: 60, hasMedia: true },
      { id: 'l5', title: 'Cinco', kind: 'video', position: 2, durationSeconds: 60, hasMedia: true },
      { id: 'l6', title: 'Seis', kind: 'video', position: 3, durationSeconds: 60, hasMedia: true },
    ],
    activities: [],
  },
] as Module[];

function submission(id: string, activityId: string, attempt: number, status: Submission['status'], createdAt: string): SubmissionHistoryItem {
  return {
    submission: { id, activityId, attempt, status, prompt: '', failureReason: null, createdAt },
    activityId,
    activityTitle: `Actividad ${activityId}`,
    courseSlug: 'slug-1',
    courseTitle: 'Curso 1',
  };
}

describe('courseToContinue', () => {
  it('prefers a started course, the one furthest along', () => {
    const rows = [
      enrolled('a', { completedLessons: 0, percentage: 0 }),
      enrolled('b', { completedLessons: 2, percentage: 33 }),
      enrolled('c', { completedLessons: 4, percentage: 66 }),
    ];
    expect(courseToContinue(rows)?.course.id).toBe('c');
  });

  it('skips finished courses and returns undefined when nothing is open', () => {
    expect(courseToContinue([enrolled('a', { isFinished: true })])).toBeUndefined();
    expect(courseToContinue([])).toBeUndefined();
  });
});

describe('heroFor', () => {
  it('places the next lesson inside the whole course once the syllabus is known', () => {
    const hero = heroFor(enrolled('1', {}, 'Gemini paso a paso'), modules);
    expect(hero).toEqual({
      kind: 'lesson',
      courseTitle: 'Gemini paso a paso',
      positionLabel: 'Lección 3 de 6',
      title: 'Un cambio sin empezar de cero',
      moduleTitle: 'Primeros pedidos',
      countLabel: '2 de 6 lecciones',
      percentLabel: '33 %',
      percentage: 33.3,
      primaryLabel: 'Continuar la lección',
      primaryHref: '/catalog/slug-1/lessons/l3',
      syllabusHref: '/catalog/slug-1',
    });
  });

  it('falls back to the lessons done before the syllabus arrives', () => {
    const hero = heroFor(enrolled('1'), null);
    expect(hero.positionLabel).toBe('Lección 3 de 6');
    expect(hero.primaryHref).toBe('/catalog/slug-1/lessons/l3');
  });

  it('points at the practice when it is the open item', () => {
    const done = progress({
      completedLessons: 6,
      percentage: 100,
      isComplete: true,
      completedLessonIds: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
      nextLesson: null,
    });
    const hero = heroFor({ course: course('1'), enrolledAt: null, progress: done }, modules);
    expect(hero.kind).toBe('activity');
    expect(hero.positionLabel).toBe('Práctica');
    expect(hero.title).toBe('Tu primera hoja');
    expect(hero.primaryLabel).toBe('Hacer la práctica');
    expect(hero.primaryHref).toBe('/lab/a1');
    expect(hero.countLabel).toBe('6 de 6 lecciones');
    expect(hero.percentLabel).toBe('100 %');
  });
});

describe('courseCardFor', () => {
  it('names the next lesson and the count', () => {
    expect(courseCardFor(enrolled('1', {}, 'Gemini paso a paso'))).toEqual({
      title: 'Gemini paso a paso',
      initial: 'G',
      nextLine: 'Sigue: Un cambio sin empezar de cero',
      countLabel: '2 de 6 lecciones',
      percentage: 33.3,
      href: '/catalog/slug-1',
    });
  });

  it('says the practice is missing once lessons are done', () => {
    const card = courseCardFor(
      enrolled('1', { isComplete: true, completedLessons: 6, percentage: 100, nextLesson: null }),
    );
    expect(card.nextLine).toBe('Falta la práctica');
    expect(card.countLabel).toBe('Lecciones listas');
  });

  it('marks a finished course', () => {
    const card = courseCardFor(
      enrolled('1', { isComplete: true, isFinished: true, completedLessons: 6, percentage: 100, nextLesson: null, pendingActivityCount: 0 }),
    );
    expect(card.nextLine).toBe('Terminado');
  });
});

describe('courseInitial', () => {
  it('keeps a short acronym and otherwise takes the first letter', () => {
    expect(courseInitial('IA para preparar tu próxima clase')).toBe('IA');
    expect(courseInitial('gemini Notebook')).toBe('G');
    expect(courseInitial('  ')).toBe('·');
  });
});

describe('nearestCertificate', () => {
  const cert = (courseTitle: string, status: Certificate['status'] = 'valid'): Certificate => ({
    id: courseTitle,
    code: 'X',
    courseTitle,
    holderName: 'Demo',
    issuedAt: null,
    status,
  });

  it('picks the started, uncertified course furthest along', () => {
    const rows = [
      enrolled('a', { percentage: 80, completedLessons: 5 }, 'Ya certificado'),
      enrolled('b', { percentage: 33, completedLessons: 2, pendingActivityCount: 1 }, 'Gemini paso a paso'),
      enrolled('c', { percentage: 0, completedLessons: 0 }, 'Sin empezar'),
    ];
    expect(nearestCertificate(rows, [cert('Ya certificado')])).toEqual({
      courseTitle: 'Gemini paso a paso',
      href: '/catalog/slug-b',
      remainingLine: 'Te faltan 4 lecciones y una práctica para tenerlo.',
    });
  });

  it('counts a revoked certificate as not held', () => {
    const rows = [enrolled('a', { percentage: 80, completedLessons: 5, pendingActivityCount: 0 }, 'Uno')];
    expect(nearestCertificate(rows, [cert('Uno', 'revoked')])?.remainingLine).toBe(
      'Te falta 1 lección para tenerlo.',
    );
  });

  it('says when everything is done and only issuing is left', () => {
    const rows = [
      enrolled('a', { percentage: 100, completedLessons: 6, isComplete: true, isFinished: true, pendingActivityCount: 0, nextLesson: null }, 'Uno'),
    ];
    expect(nearestCertificate(rows, [])?.remainingLine).toBe(
      'Ya cumpliste todo. Emítelo desde el curso.',
    );
  });

  it('pluralises practices', () => {
    const rows = [enrolled('a', { completedLessons: 6, isComplete: true, pendingActivityCount: 2 }, 'Uno')];
    expect(nearestCertificate(rows, [])?.remainingLine).toBe('Te faltan 2 prácticas para tenerlo.');
  });

  it('returns undefined when nothing is started or everything is certified', () => {
    expect(nearestCertificate([enrolled('a', { completedLessons: 0, percentage: 0 })], [])).toBeUndefined();
    expect(nearestCertificate([enrolled('a', {}, 'Uno')], [cert('Uno')])).toBeUndefined();
  });
});

describe('latestGradedAttempt', () => {
  it('takes the newest scored attempt and the scored attempt before it on the same activity', () => {
    const items = [
      submission('s4', 'a1', 3, 'failed', '2026-11-20T10:00:00Z'),
      submission('s3', 'a1', 2, 'scored', '2026-11-19T10:00:00Z'),
      submission('s9', 'a2', 1, 'scored', '2026-11-18T10:00:00Z'),
      submission('s1', 'a1', 1, 'scored', '2026-11-17T10:00:00Z'),
    ];
    const graded = latestGradedAttempt(items);
    expect(graded?.current.submission.id).toBe('s3');
    expect(graded?.previous?.submission.id).toBe('s1');
  });

  it('has no previous attempt on a first try and nothing without a scored one', () => {
    expect(latestGradedAttempt([submission('s1', 'a1', 1, 'scored', '2026-11-17T10:00:00Z')])?.previous).toBeUndefined();
    expect(latestGradedAttempt([submission('s1', 'a1', 1, 'pending', '2026-11-17T10:00:00Z')])).toBeUndefined();
  });
});

describe('labDeltaLine', () => {
  it('compares with the previous attempt', () => {
    expect(labDeltaLine(78, 64, 1)).toBe('+14 respecto al intento 1');
    expect(labDeltaLine(60, 64, 2)).toBe('−4 respecto al intento 2');
    expect(labDeltaLine(64, 64, 1)).toBe('Igual que en el intento 1');
  });

  it('says nothing without a previous score', () => {
    expect(labDeltaLine(78, null, null)).toBeNull();
  });
});

describe('greetingFor', () => {
  it('greets by first name and says where they left off', () => {
    expect(greetingFor('Demo Pérez', true)).toBe('Hola, Demo. Te quedaste aquí.');
  });

  it('drops the name when there is none and the pointer when nothing is open', () => {
    expect(greetingFor('  ', true)).toBe('Hola. Te quedaste aquí.');
    expect(greetingFor('Demo', false)).toBe('Hola, Demo.');
  });
});

describe('todayLabel', () => {
  it('writes the day in Spanish without relying on the runtime locale', () => {
    expect(todayLabel(new Date(2026, 10, 21))).toBe('Sábado 21 de noviembre');
  });
});

describe('liaLineFor', () => {
  it('follows what the hero points at', () => {
    const lesson = heroFor(enrolled('1'), modules);
    expect(liaLineFor(lesson)).toBe(
      'Lo que sigue es «Un cambio sin empezar de cero». Retomas justo donde lo dejaste.',
    );
    const practice = { ...lesson, kind: 'activity' as const, title: 'Tu primera hoja' };
    expect(liaLineFor(practice)).toBe('Ya viste las lecciones. Falta la práctica: «Tu primera hoja».');
    expect(liaLineFor(undefined)).toBe(
      'Terminaste lo que tenías abierto. En el catálogo hay más para seguir.',
    );
  });
});
