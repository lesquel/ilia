import { describe, expect, it } from 'vitest';

import { parseInline, parseLessonBody } from './lesson-body';

const SAMPLE_BODY =
  'Un modelo de lenguaje predice texto que suena plausible.\n\n' +
  'Por eso sirve para:\n' +
  '• Borradores de guías, ejemplos y preguntas.\n' +
  '• Reformular al nivel de tus estudiantes.\n\n' +
  'Y no sirve, solo, para:\n' +
  '• Certificar que un estudiante aprendió.\n' +
  '• Decidir la nota del bimestre.\n\n' +
  'Si el resultado no se parece a tu curso, casi nunca es «la IA no sirve».\n\n' +
  'Regla práctica: nada de lo que genere el modelo se imprime sin que tú lo leas.';

describe('parseLessonBody', () => {
  it('splits a teacher lesson into lead, contrast, close and rule', () => {
    const blocks = parseLessonBody(SAMPLE_BODY);

    expect(blocks.map((block) => block.type)).toEqual([
      'paragraph',
      'contrast',
      'paragraph',
      'callout',
    ]);

    const contrast = blocks[1];
    if (contrast.type !== 'contrast') throw new Error('expected contrast');
    expect(contrast.serveItems).toHaveLength(2);
    expect(contrast.avoidItems).toHaveLength(2);
    expect(contrast.serveHeading).toContain('sirve para');
  });

  it('keeps a numbered anatomy as an ordered list', () => {
    const blocks = parseLessonBody(
      'Un prompt útil tiene cuatro partes.\n\n' +
        '1. ROL. Quién es el modelo.\n' +
        '2. CONTEXTO. Qué ya vieron.\n' +
        '3. TAREA. Qué tiene que producir.\n' +
        '4. FORMATO. Cómo lo quieres de vuelta.',
    );

    expect(blocks[1]).toMatchObject({ type: 'list', ordered: true });
    if (blocks[1]?.type === 'list') {
      expect(blocks[1].items).toHaveLength(4);
    }
  });

  it('marks a long quoted prompt as a quote', () => {
    const blocks = parseLessonBody(
      'Ejemplo que puedes adaptar:\n\n' +
        '«Eres docente de matemática de séptimo. Ya vimos fracciones equivalentes. Arma 5 ejercicios.»',
    );

    expect(blocks[1]?.type).toBe('quote');
  });
});

describe('parseInline', () => {
  it('keeps emphasis around the word the teacher must own', () => {
    expect(parseInline('con lo que **tú** le cargas')).toEqual([
      { text: 'con lo que ' },
      { text: 'tú', strong: true },
      { text: ' le cargas' },
    ]);
  });
});
