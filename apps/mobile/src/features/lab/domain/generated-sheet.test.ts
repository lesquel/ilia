import { describe, expect, it } from 'vitest';

import { blocksFromGeneratedText } from './generated-sheet';

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
});
