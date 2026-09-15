import { describe, expect, it } from 'vitest';

import type { ActivityChecks } from './entities';
import {
  liaMarginNotes,
  promptWordCount,
  requirementLooksPresent,
  shortRequirementLabel,
} from './margin-notes';

const ROLE_REQUIREMENT = 'Dale al modelo un rol o di para quién es la respuesta.';
const FORMAT_REQUIREMENT = 'Indica en qué formato quieres la respuesta.';
const MIN_LENGTH_REQUIREMENT = 'Escribe al menos 20 palabras.';
const MENTION_REQUIREMENT = 'Menciona: grado.';

const DRAFT_WITHOUT_FORMAT =
  'Eres un docente de matemáticas de séptimo. Ya vieron fracciones propias. Arma 8 ejercicios para 45 minutos, del más fácil al más difícil, con el resultado al final de cada uno.';

const PROMPTING_CHECKS: ActivityChecks = {
  requiresRole: true,
  requiresFormat: true,
  minLength: 20,
  maxLength: 0,
  requiredTerms: [['grado', 'séptimo', 'septimo', 'noveno', 'año']],
};

describe('shortRequirementLabel', () => {
  it('shortens the mechanical checks into margin slips', () => {
    expect(shortRequirementLabel(ROLE_REQUIREMENT)).toBe('Rol');
    expect(shortRequirementLabel(FORMAT_REQUIREMENT)).toBe('Formato');
    expect(shortRequirementLabel(MIN_LENGTH_REQUIREMENT)).toBe('20 palabras');
    expect(shortRequirementLabel(MENTION_REQUIREMENT)).toBe('Grado');
  });
});

describe('requirementLooksPresent', () => {
  it('marks role and length on the recovered draft, and leaves format off', () => {
    expect(requirementLooksPresent(ROLE_REQUIREMENT, DRAFT_WITHOUT_FORMAT)).toBe(true);
    expect(requirementLooksPresent(MIN_LENGTH_REQUIREMENT, DRAFT_WITHOUT_FORMAT)).toBe(true);
    expect(requirementLooksPresent(FORMAT_REQUIREMENT, DRAFT_WITHOUT_FORMAT)).toBe(false);
  });

  it('accepts tabla as the format the platform already looks for', () => {
    expect(
      requirementLooksPresent(FORMAT_REQUIREMENT, `${DRAFT_WITHOUT_FORMAT} Devuelve una tabla.`),
    ).toBe(true);
  });
});

describe('liaMarginNotes', () => {
  it('uses the check spec so séptimo lights Grado, even if the slip says Grado', () => {
    const notes = liaMarginNotes([], DRAFT_WITHOUT_FORMAT, PROMPTING_CHECKS);

    expect(notes.map((note) => note.label)).toEqual(['Rol', 'Formato', '20 palabras', 'Grado']);
    expect(notes.map((note) => note.isPresent)).toEqual([true, false, true, true]);
  });

  it('falls back to the stated requirements when the spec is empty', () => {
    const notes = liaMarginNotes(
      [ROLE_REQUIREMENT, FORMAT_REQUIREMENT],
      DRAFT_WITHOUT_FORMAT,
    );

    expect(notes.map((note) => note.label)).toEqual(['Rol', 'Formato']);
    expect(notes.map((note) => note.isPresent)).toEqual([true, false]);
  });

  it('counts words the same way the length check does', () => {
    expect(promptWordCount('  uno   dos\ntres  ')).toBe(3);
    expect(promptWordCount('   ')).toBe(0);
  });
});
