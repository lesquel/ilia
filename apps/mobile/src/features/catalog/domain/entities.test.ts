import { describe, expect, it } from 'vitest';

import {
  nextCourseAlongLearningPath,
  sortCoursesAlongLearningPath,
  type Level,
} from './entities';

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
