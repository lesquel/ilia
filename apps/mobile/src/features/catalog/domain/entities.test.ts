import { describe, expect, it } from 'vitest';

import { sortCoursesAlongLearningPath, type Level } from './entities';

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
