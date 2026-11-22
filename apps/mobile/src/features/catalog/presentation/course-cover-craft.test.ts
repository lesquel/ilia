import { describe, expect, it } from 'vitest';

import { coverCraftForCourseSlug } from './course-cover-craft';

describe('coverCraftForCourseSlug', () => {
  it('maps each published course to the craft of that course', () => {
    expect(coverCraftForCourseSlug('prompting-para-docentes')).toBe('writing-prompt');
    expect(coverCraftForCourseSlug('notebooklm-en-el-aula')).toBe('showing-chapter');
    expect(coverCraftForCourseSlug('evaluacion-asistida-por-ia')).toBe('reading-rubric');
  });

  it('gives the two first published courses a scene of their own', () => {
    expect(coverCraftForCourseSlug('introduccion-ia-docentes')).toBe('writing-prompt');
    expect(coverCraftForCourseSlug('ia-para-docentes')).toBe('showing-chapter');
  });

  it('gives each cápsula course the scene of the tool it teaches', () => {
    expect(coverCraftForCourseSlug('gemini-paso-a-paso')).toBe('chat-exchange');
    expect(coverCraftForCourseSlug('notebooklm-paso-a-paso')).toBe('cited-source');
    expect(coverCraftForCourseSlug('prueba-corta-en-forms')).toBe('quiz-question');
    expect(coverCraftForCourseSlug('lamina-en-canva')).toBe('three-part-slide');
  });

  it('does not invent a scene for an unknown slug', () => {
    expect(coverCraftForCourseSlug('un-curso-que-no-existe')).toBeUndefined();
  });
});
