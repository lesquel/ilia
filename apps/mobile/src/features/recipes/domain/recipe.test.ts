import { describe, expect, it } from 'vitest';

import { addRecipe, hasRecipe, removeRecipe, toClassroomText, type Recipe } from './recipe';

function recipe(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id,
    prompt: `Pedido ${id}`,
    activityTitle: `Actividad ${id}`,
    score: 80,
    savedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('addRecipe', () => {
  it('puts the newest recipe first', () => {
    const list = addRecipe([recipe('a')], recipe('b'));
    expect(list.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('replaces a recipe saved from the same submission instead of duplicating it', () => {
    const list = addRecipe([recipe('a'), recipe('b')], recipe('b', { note: 'Para tercero' }));
    expect(list.map((r) => r.id)).toEqual(['b', 'a']);
    expect(list[0].note).toBe('Para tercero');
  });

  it('does not mutate the list it was given', () => {
    const original = [recipe('a')];
    addRecipe(original, recipe('b'));
    expect(original).toHaveLength(1);
  });
});

describe('removeRecipe', () => {
  it('drops only the recipe with that submission id', () => {
    expect(removeRecipe([recipe('a'), recipe('b')], 'a').map((r) => r.id)).toEqual(['b']);
  });

  it('leaves the list unchanged when the id is unknown', () => {
    expect(removeRecipe([recipe('a')], 'x').map((r) => r.id)).toEqual(['a']);
  });
});

describe('hasRecipe', () => {
  it('tells whether a submission is already saved', () => {
    expect(hasRecipe([recipe('a')], 'a')).toBe(true);
    expect(hasRecipe([recipe('a')], 'b')).toBe(false);
  });
});

describe('toClassroomText', () => {
  it('starts with the activity title and carries the prompt verbatim', () => {
    const text = toClassroomText(recipe('a', { prompt: 'Escribe tres preguntas\nsobre fracciones.' }));
    expect(text.startsWith('Actividad a')).toBe(true);
    expect(text).toContain('Escribe tres preguntas\nsobre fracciones.');
  });

  it('includes the note only when there is one', () => {
    expect(toClassroomText(recipe('a', { note: 'Usar en cuarto' }))).toContain('Apunte: Usar en cuarto');
    expect(toClassroomText(recipe('a'))).not.toContain('Apunte:');
  });
});
