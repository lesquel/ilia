import { describe, expect, it } from 'vitest';

import { coverCraftForCourseSlug } from './course-cover-craft';

describe('coverCraftForCourseSlug', () => {
  it('maps each published course to the craft of that course', () => {
    expect(coverCraftForCourseSlug('prompting-para-docentes')).toBe('writing-prompt');
    expect(coverCraftForCourseSlug('notebooklm-en-el-aula')).toBe('showing-chapter');
    expect(coverCraftForCourseSlug('evaluacion-asistida-por-ia')).toBe('reading-rubric');
  });

  it('does not invent a scene for an unknown slug', () => {
    expect(coverCraftForCourseSlug('un-curso-que-no-existe')).toBeUndefined();
  });
});
