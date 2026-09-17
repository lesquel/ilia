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

  it('turns a fenced example into a table the teacher can copy', () => {
    const blocks = parseLessonBody(
      'El modelo no siente el reloj.\n\n' +
        ':::ejemplo Plan de 45 minutos (fracciones, 7.º)\n' +
        '| Tiempo | Momento | Qué hace quién |\n' +
        '| 8 min | Apertura | El docente proyecta 1/2 y 2/4. |\n' +
        '| 5 min | Cierre | Un estudiante dicta la regla. |\n' +
        ':::',
    );

    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'example']);
    const example = blocks[1];
    if (example?.type !== 'example') throw new Error('expected example');
    expect(example.example.title).toContain('45 minutos');
    expect(example.example.kind).toBe('table');
    expect(example.example.table?.headers).toEqual(['Tiempo', 'Momento', 'Qué hace quién']);
    expect(example.example.table?.rows).toHaveLength(2);
  });

  it('pairs a weak prompt with the one that works', () => {
    const blocks = parseLessonBody(
      ':::ejemplo Prompt flojo\nHaz un ejercicio de fracciones.\n:::\n\n' +
        ':::ejemplo Prompt que sí\nEres docente de matemática de séptimo. Arma 5 ejercicios.\n:::',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('examplePair');
    if (blocks[0]?.type !== 'examplePair') throw new Error('expected pair');
    expect(blocks[0].weak.kind).toBe('prompt');
    expect(blocks[0].strong.kind).toBe('prompt');
  });

  it('pairs a spoken pedido with the sheet that pedido should return', () => {
    const blocks = parseLessonBody(
      ':::ejemplo Si pides algo como esto\nHazme una lectura de séptimo, bien creativa.\n:::\n\n' +
        ':::ejemplo Esperamos: te sale cualquiera\n1. Hierve el agua.\n:::',
    );

    expect(blocks[0]?.type).toBe('promptResult');
    if (blocks[0]?.type !== 'promptResult') throw new Error('expected promptResult');
    expect(blocks[0].prompt.kind).toBe('prompt');
  });

  it('pairs a structured prompt with the sheet that prompt should return', () => {
    const blocks = parseLessonBody(
      ':::ejemplo Prompt que sí\nEres docente de matemática de séptimo. Arma 5 ejercicios.\n:::\n\n' +
        ':::ejemplo Esperamos: hoja de 5 ejercicios\n' +
        '| # | Consigna | Respuesta |\n' +
        '| 1 | En el mercado, ¿cuánto es 1/4 + 1/2? | 3/4 |\n' +
        '| 2 | Ana camina 2/3 y luego 1/6. ¿Cuánto recorrió? | 5/6 |\n' +
        ':::',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('promptResult');
    if (blocks[0]?.type !== 'promptResult') throw new Error('expected promptResult');
    expect(blocks[0].prompt.kind).toBe('prompt');
    expect(blocks[0].result.kind).toBe('table');
    expect(blocks[0].result.table?.rows).toHaveLength(2);
  });

  it('keeps the reading paragraph when the expected sheet also has questions', () => {
    const blocks = parseLessonBody(
      ':::ejemplo Esperamos: la hoja que te llevas el lunes\n' +
        'En el mercado de Tarqui el sábado se oye primero a quien vende pescado. Juana llega temprano y se lleva dos libras.\n\n' +
        '| # | Pregunta | Se contesta con |\n' +
        '| 1 | ¿Dónde está Juana? | En el mercado de Tarqui |\n' +
        '| 2 | ¿Qué se lleva? | Dos libras |\n' +
        ':::',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('example');
    if (blocks[0]?.type !== 'example') throw new Error('expected example');
    const sheetProse = blocks[0].example.inlines.map((part) => part.text).join('');
    expect(sheetProse).toContain('Juana llega temprano');
    expect(blocks[0].example.table?.headers).toEqual(['#', 'Pregunta', 'Se contesta con']);
    expect(blocks[0].example.table?.rows).toHaveLength(2);
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
