import { describe, expect, it } from 'vitest';

import {
  blocksFromGeneratedText,
  figureFromMarkup,
  figureFromTableCell,
} from './generated-sheet';

const SAMPLE = `Aquí tienes una tabla con 8 ejercicios.

| Ejercicio | Resultado |
|-----------|-----------|
| 1. ¿Cuál es 1/2 + 1/4? | 3/4 |
| 2. ¿Cuál es 2/3 - 1/6? | 1/2 |

Estos ejercicios sirven para practicar.`;

describe('blocksFromGeneratedText', () => {
  it('turns a markdown table into headers and rows, and keeps the prose', () => {
    const blocks = blocksFromGeneratedText(SAMPLE);

    expect(blocks[0]).toEqual({
      kind: 'paragraph',
      text: 'Aquí tienes una tabla con 8 ejercicios.',
    });
    expect(blocks[1]).toEqual({
      kind: 'table',
      headers: ['Ejercicio', 'Resultado'],
      rows: [
        ['1. ¿Cuál es 1/2 + 1/4?', '3/4'],
        ['2. ¿Cuál es 2/3 - 1/6?', '1/2'],
      ],
    });
    expect(blocks[2]).toEqual({
      kind: 'paragraph',
      text: 'Estos ejercicios sirven para practicar.',
    });
  });

  it('returns a single paragraph when there is no table', () => {
    expect(blocksFromGeneratedText('Solo un párrafo.')).toEqual([
      { kind: 'paragraph', text: 'Solo un párrafo.' },
    ]);
  });

  it('draws a pie from compact exam markup', () => {
    expect(figureFromMarkup('[[pastel 3/8]]')).toEqual({
      paintedSlices: 3,
      totalSlices: 8,
    });
    expect(figureFromMarkup('[[pie 8]]')).toEqual({
      paintedSlices: 0,
      totalSlices: 8,
    });

    const blocks = blocksFromGeneratedText(
      '[[pastel 8]] ¿Cuántos trozos hay en este pastel?',
    );
    expect(blocks[0]).toEqual({
      kind: 'figure',
      figure: 'pie',
      paintedSlices: 0,
      totalSlices: 8,
      caption: '¿Cuántos trozos hay en este pastel?',
    });
  });

  it('draws a pie from a spoken exam line', () => {
    const blocks = blocksFromGeneratedText(
      'Este pastel está dividido en 8 trozos iguales. 3 trozos están pintados. ¿Qué fracción representa la parte pintada?',
    );
    expect(blocks[0]).toMatchObject({
      kind: 'figure',
      figure: 'pie',
      paintedSlices: 3,
      totalSlices: 8,
    });
    expect(blocks[0].kind === 'figure' && blocks[0].caption).toContain('¿Qué fracción');
  });

  it('does not turn an addition table into pies', () => {
    const blocks = blocksFromGeneratedText(SAMPLE);
    expect(blocks.every((block) => block.kind !== 'figure')).toBe(true);
    expect(
      figureFromTableCell('3/4', 'Resultado', false),
    ).toBeNull();
  });

  it('paints a pie inside a figurative table cell', () => {
    expect(figureFromTableCell('3/8', 'Pastel', true)).toEqual({
      paintedSlices: 3,
      totalSlices: 8,
    });
  });

  it('reads the way the model actually describes a pastel exam', () => {
    const blocks = blocksFromGeneratedText(`**Hoja de Examen**

**Ejercicio 1:**
Imagina un pastel delicioso que está dividido en 8 trozos iguales. Pregunta: ¿Cuántos trozos hay en total?

**Ejercicio 2:**
Ahora visualiza un pastel que tiene 8 trozos iguales, de los cuales 3 están pintados de un color brillante. Pregunta: ¿Qué fracción del pastel está pintada?

**Ejercicio 3:**
Piensa en un pastel que también está dividido en 8 trozos iguales. En esta ocasión, 5 de esos trozos están pintados. Pregunta: ¿Qué fracción representa la parte pintada del pastel?
`);

    const pies = blocks.filter((block) => block.kind === 'figure');
    expect(pies).toEqual([
      {
        kind: 'figure',
        figure: 'pie',
        paintedSlices: 0,
        totalSlices: 8,
        caption: '¿Cuántos trozos hay en total?',
      },
      {
        kind: 'figure',
        figure: 'pie',
        paintedSlices: 3,
        totalSlices: 8,
        caption: '¿Qué fracción del pastel está pintada?',
      },
      {
        kind: 'figure',
        figure: 'pie',
        paintedSlices: 5,
        totalSlices: 8,
        caption: '¿Qué fracción representa la parte pintada del pastel?',
      },
    ]);
  });
});
