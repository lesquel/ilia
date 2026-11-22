import { describe, expect, it } from 'vitest';

import { lessonStepStates, lessonStepStatesByPosition } from './lesson-steps';

describe('lessonStepStates', () => {
  it('marks completed lessons done, the open one current and the rest next', () => {
    expect(
      lessonStepStates({
        lessonIds: ['a', 'b', 'c', 'd'],
        currentLessonId: 'c',
        completedLessonIds: ['a', 'b'],
      }),
    ).toEqual(['done', 'done', 'current', 'next']);
  });

  it('keeps the open lesson current even when it is already completed', () => {
    expect(
      lessonStepStates({
        lessonIds: ['a', 'b'],
        currentLessonId: 'a',
        completedLessonIds: ['a', 'b'],
      }),
    ).toEqual(['current', 'done']);
  });

  it('does not call a skipped earlier lesson done', () => {
    expect(
      lessonStepStates({
        lessonIds: ['a', 'b', 'c'],
        currentLessonId: 'c',
        completedLessonIds: ['b'],
      }),
    ).toEqual(['next', 'done', 'current']);
  });
});

describe('lessonStepStatesByPosition', () => {
  it('falls back to the lesson position when progress is unknown', () => {
    expect(lessonStepStatesByPosition(3, 5)).toEqual(['done', 'done', 'current', 'next', 'next']);
  });

  it('returns nothing for an empty course or an out-of-range position', () => {
    expect(lessonStepStatesByPosition(1, 0)).toEqual([]);
    expect(lessonStepStatesByPosition(0, 3)).toEqual([]);
    expect(lessonStepStatesByPosition(4, 3)).toEqual([]);
  });
});
