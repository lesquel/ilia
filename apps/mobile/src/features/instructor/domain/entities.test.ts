import { describe, expect, it } from 'vitest';

import { slugify } from './entities';

/**
 * The exact rule the API enforces (`app/features/catalog/domain/entities.py`).
 * Duplicated here on purpose: this test exists to catch the two sides drifting
 * apart, and importing the rule from one of them would defeat that.
 */
const BACKEND_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugify', () => {
  it('produces a slug the API will accept', () => {
    expect(slugify('Prompting para docentes')).toBe('prompting-para-docentes');
    expect(BACKEND_SLUG.test(slugify('Prompting para docentes'))).toBe(true);
  });

  it('strips accents rather than percent-encoding them into the URL', () => {
    // `Prompting básico` must not become `prompting-b%C3%A1sico`.
    expect(slugify('Prompting básico')).toBe('prompting-basico');
    expect(slugify('Evaluación asistida por IA')).toBe('evaluacion-asistida-por-ia');
    expect(slugify('Diseño de ñandúes')).toBe('diseno-de-nandues');
  });

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('¿Qué es un prompt?')).toBe('que-es-un-prompt');
    expect(slugify('IA  —  para   el aula')).toBe('ia-para-el-aula');
  });

  it('never leaves a leading or trailing hyphen', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola');
    expect(slugify('---IA---')).toBe('ia');
  });

  it('stays valid when a long title is truncated', () => {
    // The cut is applied after trimming, so a title long enough for the limit
    // to land on a separator used to produce a trailing hyphen — which the API
    // rejects, turning a long course title into a 400 the instructor cannot
    // explain.
    const title = `${'a'.repeat(159)} bcdef`;
    const slug = slugify(title);

    expect(slug.endsWith('-')).toBe(false);
    expect(BACKEND_SLUG.test(slug)).toBe(true);
  });

  it('answers with an empty string when there is nothing to slug', () => {
    // Not a valid slug, and it must not pretend otherwise: the caller has to
    // see that the title gave nothing and ask for another one.
    expect(slugify('¿?¡!')).toBe('');
    expect(slugify('')).toBe('');
  });
});
