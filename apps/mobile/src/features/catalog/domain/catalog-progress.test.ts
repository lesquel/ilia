import { describe, expect, it } from 'vitest';

import type { CourseSummary, Level } from './entities';
import {
  catalogCallToAction,
  catalogProgressBySlug,
  catalogProgressLine,
  coursesInProgress,
  matchesCourseQuery,
  type CatalogProgress,
} from './catalog-progress';

function course(slug: string, level: Level = 'beginner', title = slug): CourseSummary {
  return {
    id: `id-${slug}`,
    slug,
    title,
    summary: `Resumen de ${title}`,
    level,
    instructorName: 'Rosa',
    lessonCount: 6,
    durationSeconds: 480,
  };
}

function row(
  slug: string,
  progress: Partial<{
    percentage: number;
    completedLessons: number;
    totalLessons: number;
    isComplete: boolean;
    isFinished: boolean;
    nextLesson: { lessonTitle: string } | null;
  }> = {},
  level: Level = 'beginner',
) {
  return {
    course: course(slug, level),
    progress: {
      percentage: 33,
      completedLessons: 2,
      totalLessons: 6,
      isComplete: false,
      isFinished: false,
      nextLesson: { lessonTitle: 'Un cambio sin empezar de cero' },
      ...progress,
    },
  };
}

const started: CatalogProgress = {
  percentage: 33,
  completedLessons: 2,
  totalLessons: 6,
  nextLessonTitle: 'Un cambio sin empezar de cero',
  lessonsDone: false,
  isFinished: false,
};

describe('catalogProgressBySlug', () => {
  it('keys each enrolled course by its slug with the progress the card shows', () => {
    const map = catalogProgressBySlug([row('gemini'), row('forms', { nextLesson: null, isComplete: true, percentage: 100, completedLessons: 6 })]);

    expect(map.gemini).toEqual(started);
    expect(map.forms).toEqual({
      percentage: 100,
      completedLessons: 6,
      totalLessons: 6,
      nextLessonTitle: null,
      lessonsDone: true,
      isFinished: false,
    });
  });

  it('has no entry for a course nobody enrolled in', () => {
    expect(catalogProgressBySlug([row('gemini')]).canva).toBeUndefined();
  });
});

describe('coursesInProgress', () => {
  it('lists enrolled courses that are not finished, along the learning path', () => {
    const rows = [
      row('expert', {}, 'expert'),
      row('done', { isFinished: true, isComplete: true, nextLesson: null }),
      row('basic', {}, 'beginner'),
    ];

    expect(coursesInProgress(rows).map((item) => item.slug)).toEqual(['basic', 'expert']);
  });

  it('filters by the submitted search the same way the catalog does', () => {
    const rows = [row('gemini'), row('canva')];
    expect(coursesInProgress(rows, 'CAN').map((item) => item.slug)).toEqual(['canva']);
  });
});

describe('matchesCourseQuery', () => {
  it('matches title or summary, ignoring case and accents', () => {
    const lamina = { ...course('canva'), title: 'Una lámina en Canva' };
    expect(matchesCourseQuery(lamina, 'lamina')).toBe(true);
    expect(matchesCourseQuery(lamina, 'resumen')).toBe(true);
    expect(matchesCourseQuery(lamina, 'forms')).toBe(false);
  });

  it('matches everything when the query is blank', () => {
    expect(matchesCourseQuery(course('x'), '  ')).toBe(true);
    expect(matchesCourseQuery(course('x'), undefined)).toBe(true);
  });
});

describe('catalogProgressLine', () => {
  it('names the next lesson while lessons remain', () => {
    expect(catalogProgressLine(started)).toBe('Sigue: Un cambio sin empezar de cero');
  });

  it('points at the practice once the lessons are done', () => {
    expect(catalogProgressLine({ ...started, nextLessonTitle: null, lessonsDone: true })).toBe(
      'Lecciones listas · falta la práctica',
    );
  });

  it('says the course is finished', () => {
    expect(
      catalogProgressLine({ ...started, nextLessonTitle: null, lessonsDone: true, isFinished: true }),
    ).toBe('Curso terminado');
  });
});

describe('catalogCallToAction', () => {
  it('says "Empezar" for a course the teacher is not in', () => {
    expect(catalogCallToAction(undefined)).toBe('Empezar');
  });

  it('says "Continuar" for an enrolled course with lessons left', () => {
    expect(catalogCallToAction(started)).toBe('Continuar');
    expect(catalogCallToAction({ ...started, completedLessons: 0, percentage: 0 })).toBe('Continuar');
  });

  it('sends a course with only the practice left to the practice', () => {
    expect(catalogCallToAction({ ...started, lessonsDone: true, nextLessonTitle: null })).toBe(
      'Ir a la práctica',
    );
  });

  it('offers a review of a finished course', () => {
    expect(catalogCallToAction({ ...started, lessonsDone: true, isFinished: true })).toBe(
      'Repasar el curso',
    );
  });
});
