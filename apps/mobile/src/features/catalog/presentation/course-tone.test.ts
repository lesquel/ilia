import { describe, expect, it } from 'vitest';

import { courseAccent } from './course-tone';

const FALLBACK = { ink: '#0E58D6', wash: '#E3EDFF', mid: '#9DBDFF' };

describe('courseAccent', () => {
  it('uses the course its own color, the same one its cover carries', () => {
    expect(courseAccent('gemini-paso-a-paso', FALLBACK)).toEqual({
      ink: '#4A41BE',
      wash: '#E9E8FB',
      mid: '#C9C6F3',
    });
  });

  it('falls back to the app accent for a course without its own color', () => {
    expect(courseAccent('curso-sin-portada', FALLBACK)).toEqual(FALLBACK);
    expect(courseAccent(undefined, FALLBACK)).toEqual(FALLBACK);
  });
});
