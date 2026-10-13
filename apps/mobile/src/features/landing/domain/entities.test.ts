import { describe, expect, it } from 'vitest';

import { featuredCoursesHeading } from './entities';

describe('featuredCoursesHeading', () => {
  it('counts the courses it lists when they are the whole catalogue', () => {
    expect(featuredCoursesHeading(3, false)).toBe('Los tres cursos');
    expect(featuredCoursesHeading(2, false)).toBe('Los dos cursos');
    expect(featuredCoursesHeading(1, false)).toBe('El curso');
  });

  it('does not pass a selection off as the whole catalogue', () => {
    expect(featuredCoursesHeading(3, true)).toBe('Los tres primeros cursos');
    expect(featuredCoursesHeading(1, true)).toBe('El primer curso');
  });

  it('states no number when there is none it can stand behind', () => {
    expect(featuredCoursesHeading(0, false)).toBe('Los cursos');
    expect(featuredCoursesHeading(7, true)).toBe('Los cursos');
  });
});
