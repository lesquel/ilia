import { describe, expect, it } from 'vitest';

import { coverCraftForCourseSlug, coverToneForCourseSlug } from './course-cover-craft';

const PUBLISHED = [
  'introduccion-ia-docentes',
  'ia-para-docentes',
  'prompting-para-docentes',
  'notebooklm-en-el-aula',
  'evaluacion-asistida-por-ia',
  'gemini-paso-a-paso',
  'notebooklm-paso-a-paso',
  'prueba-corta-en-forms',
  'lamina-en-canva',
];

describe('coverCraftForCourseSlug', () => {
  it('gives each cápsula course the scene of the tool it teaches', () => {
    expect(coverCraftForCourseSlug('gemini-paso-a-paso')).toBe('chat-exchange');
    expect(coverCraftForCourseSlug('notebooklm-paso-a-paso')).toBe('cited-source');
    expect(coverCraftForCourseSlug('prueba-corta-en-forms')).toBe('quiz-question');
    expect(coverCraftForCourseSlug('lamina-en-canva')).toBe('three-part-slide');
  });

  it('never draws two published courses with the same scene', () => {
    const crafts = PUBLISHED.map(coverCraftForCourseSlug);

    expect(crafts).not.toContain(undefined);
    expect(new Set(crafts).size).toBe(PUBLISHED.length);
  });

  it('does not invent a scene for an unknown slug', () => {
    expect(coverCraftForCourseSlug('un-curso-que-no-existe')).toBeUndefined();
  });
});

describe('coverToneForCourseSlug', () => {
  it('gives each published course a color of its own', () => {
    const inks = PUBLISHED.map((slug) => coverToneForCourseSlug(slug)?.ink);

    expect(inks).not.toContain(undefined);
    expect(new Set(inks).size).toBe(PUBLISHED.length);
  });

  it('leaves an unknown course on the brand color', () => {
    expect(coverToneForCourseSlug('un-curso-que-no-existe')).toBeUndefined();
  });
});
