import { describe, expect, it } from 'vitest';

import {
  currentItemIdInModule,
  nextCourseAlongLearningPath,
  nextOpenSyllabusItem,
  sortCoursesAlongLearningPath,
  syllabusStationLabel,
  syllabusStationStatuses,
  type Level,
  type Module,
} from './entities';

function moduleFixture(id: string, lessonIds: string[], activityIds: string[] = []): Module {
  return {
    id,
    title: id,
    position: 1,
    lessons: lessonIds.map((lessonId, index) => ({
      id: lessonId,
      title: lessonId,
      kind: 'text',
      position: index + 1,
      durationSeconds: 60,
      hasMedia: false,
    })),
    activities: activityIds.map((activityId) => ({
      id: activityId,
      title: activityId,
      maxAttempts: 3,
    })),
  };
}

describe('sortCoursesAlongLearningPath', () => {
  it('puts the starting course first, not the one published last', () => {
    const ordered = sortCoursesAlongLearningPath([
      { slug: 'evaluacion', level: 'expert' as Level },
      { slug: 'notebooklm', level: 'intermediate' as Level },
      { slug: 'prompting', level: 'beginner' as Level },
    ]);

    expect(ordered.map((course) => course.slug)).toEqual([
      'prompting',
      'notebooklm',
      'evaluacion',
    ]);
  });
});

describe('nextCourseAlongLearningPath', () => {
  it('points at the next level, not back at the one just finished', () => {
    const catalog = [
      { id: '1', slug: 'prompting', level: 'beginner' as Level },
      { id: '2', slug: 'notebooklm', level: 'intermediate' as Level },
      { id: '3', slug: 'evaluacion', level: 'expert' as Level },
    ];

    expect(nextCourseAlongLearningPath(catalog[0]!, catalog)?.slug).toBe('notebooklm');
    expect(nextCourseAlongLearningPath(catalog[2]!, catalog)).toBeUndefined();
  });
});

describe('syllabusStationStatuses', () => {
  const first = moduleFixture('oficio', ['a', 'b'], ['prac']);
  const second = moduleFixture('material', ['c']);
  const third = moduleFixture('aula', ['d']);

  it('marks the first chapter as the start for a visitor', () => {
    expect(syllabusStationStatuses([first, second, third], [], [], false)).toEqual([
      'now',
      'wait',
      'wait',
    ]);
  });

  it('shows done, here, waiting once some chapters are finished', () => {
    expect(
      syllabusStationStatuses([first, second, third], ['a', 'b'], ['prac'], true),
    ).toEqual(['done', 'now', 'wait']);
    expect(syllabusStationLabel('done', true)).toBe('Hecho');
    expect(syllabusStationLabel('now', true)).toBe('Aquí vas');
    expect(currentItemIdInModule(second, [], [])).toBe('c');
  });

  it('points at the practice when the lessons are done and the lab is not', () => {
    const open = nextOpenSyllabusItem([first, second], ['a', 'b', 'c'], []);
    expect(open).toEqual({ id: 'prac', title: 'prac', kind: 'activity' });
  });
});
