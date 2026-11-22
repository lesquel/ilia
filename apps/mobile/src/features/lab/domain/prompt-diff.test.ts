import { describe, expect, it } from 'vitest';

import { diffPromptWords } from './prompt-diff';

describe('diffPromptWords', () => {
  it('marks only the words that are new in the later prompt', () => {
    expect(diffPromptWords('Haz una hoja de fracciones.', 'Haz una hoja de fracciones en tabla.')).toEqual([
      { text: 'Haz una hoja de ', added: false },
      { text: 'fracciones en tabla.', added: true },
    ]);
  });

  it('keeps the later prompt intact, whitespace included', () => {
    const later = 'Actúa como docente.\nObjetivo: fracciones.  Seis ejercicios.';
    const segments = diffPromptWords('Actúa como docente.', later);
    expect(segments.map((segment) => segment.text).join('')).toBe(later);
    expect(segments.filter((segment) => segment.added).map((s) => s.text.trim())).toEqual([
      'Objetivo: fracciones.  Seis ejercicios.',
    ]);
  });

  it('marks nothing when the prompt did not change', () => {
    expect(diffPromptWords('Igual que antes', 'Igual que antes')).toEqual([
      { text: 'Igual que antes', added: false },
    ]);
  });

  it('marks everything when nothing was kept', () => {
    expect(diffPromptWords('uno dos', 'tres cuatro')).toEqual([{ text: 'tres cuatro', added: true }]);
  });

  it('returns no segments for an empty later prompt', () => {
    expect(diffPromptWords('algo', '')).toEqual([]);
  });
});
