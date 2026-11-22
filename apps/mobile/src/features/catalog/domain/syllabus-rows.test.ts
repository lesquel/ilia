import { describe, expect, it } from 'vitest';

import type { LessonKind, Module } from './entities';
import { continueLabel, courseAdvance, dominantLessonKind, syllabusRows } from './syllabus-rows';

function moduleFixture(
  id: string,
  position: number,
  lessons: [string, LessonKind?][],
  activityIds: string[] = [],
): Module {
  return {
    id,
    title: `Capítulo ${id}`,
    position,
    lessons: lessons.map(([lessonId, kind], index) => ({
      id: lessonId,
      title: `Lección ${lessonId}`,
      kind: kind ?? 'text',
      position: index + 1,
      durationSeconds: 60,
      hasMedia: false,
    })),
    activities: activityIds.map((activityId) => ({
      id: activityId,
      title: `Taller ${activityId}`,
      maxAttempts: 3,
    })),
  };
}

const modules = [
  moduleFixture('m1', 1, [['l1'], ['l2']]),
  moduleFixture('m2', 2, [['l3'], ['l4']], ['a1']),
];

describe('syllabusRows', () => {
  it('marks done rows, one current row (the next open item) and the rest as next', () => {
    const groups = syllabusRows(modules, ['l1', 'l2'], [], true);

    expect(groups.map((group) => group.module.id)).toEqual(['m1', 'm2']);
    expect(groups.flatMap((group) => group.rows.map((r) => [r.id, r.state]))).toEqual([
      ['l1', 'done'],
      ['l2', 'done'],
      ['l3', 'current'],
      ['l4', 'next'],
      ['a1', 'next'],
    ]);
  });

  it('numbers lessons across the whole course and leaves the practice unnumbered', () => {
    const rows = syllabusRows(modules, [], [], true).flatMap((group) => group.rows);
    expect(rows.map((r) => [r.id, r.kind, r.number])).toEqual([
      ['l1', 'lesson', 1],
      ['l2', 'lesson', 2],
      ['l3', 'lesson', 3],
      ['l4', 'lesson', 4],
      ['a1', 'activity', undefined],
    ]);
  });

  it('makes the practice current once every lesson before it is done', () => {
    const rows = syllabusRows(modules, ['l1', 'l2', 'l3', 'l4'], [], true).flatMap((g) => g.rows);
    expect(rows.find((r) => r.id === 'a1')?.state).toBe('current');
  });

  it('shows a visitor nothing as done or current', () => {
    const rows = syllabusRows(modules, ['l1'], ['a1'], false).flatMap((g) => g.rows);
    expect(rows.every((r) => r.state === 'next')).toBe(true);
  });
});

describe('courseAdvance', () => {
  it('counts lessons done out of the lessons in the syllabus, with the next one by number', () => {
    expect(courseAdvance(modules, ['l1', 'l2'], [], true)).toEqual({
      done: 2,
      total: 4,
      percentage: 50,
      next: { id: 'l3', kind: 'lesson', title: 'Lección l3', number: 3 },
    });
  });

  it('ignores completed ids that are not in this syllabus', () => {
    expect(courseAdvance(modules, ['l1', 'other'], [], true).done).toBe(1);
  });

  it('has no next item when everything is done', () => {
    expect(courseAdvance(modules, ['l1', 'l2', 'l3', 'l4'], ['a1'], true).next).toBeUndefined();
  });

  it('is zero for an empty syllabus', () => {
    expect(courseAdvance([], [], [], true)).toEqual({ done: 0, total: 0, percentage: 0, next: undefined });
  });
});

describe('continueLabel', () => {
  it('names the lesson number to continue at', () => {
    expect(continueLabel(courseAdvance(modules, ['l1', 'l2'], [], true))).toBe('Continuar · lección 3');
  });

  it('says "Empezar" before the first lesson', () => {
    expect(continueLabel(courseAdvance(modules, [], [], true))).toBe('Empezar · lección 1');
  });

  it('goes to the practice when only the practice is left', () => {
    expect(continueLabel(courseAdvance(modules, ['l1', 'l2', 'l3', 'l4'], [], true))).toBe(
      'Ir a la práctica',
    );
  });

  it('has no label once the course is finished', () => {
    expect(continueLabel(courseAdvance(modules, ['l1', 'l2', 'l3', 'l4'], ['a1'], true))).toBeUndefined();
  });
});

describe('dominantLessonKind', () => {
  it('returns the kind most lessons are', () => {
    const mixed = [moduleFixture('m', 1, [['a', 'video'], ['b', 'video'], ['c', 'text']])];
    expect(dominantLessonKind(mixed)).toBe('video');
  });

  it('breaks a tie with the kind that comes first', () => {
    const tie = [moduleFixture('m', 1, [['a', 'slides'], ['b', 'video']])];
    expect(dominantLessonKind(tie)).toBe('slides');
  });

  it('is undefined without lessons', () => {
    expect(dominantLessonKind([])).toBeUndefined();
  });
});
