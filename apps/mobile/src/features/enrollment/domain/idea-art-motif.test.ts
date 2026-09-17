import { describe, expect, it } from 'vitest';

import { motifForIdeaScene } from './idea-art-motif';

describe('motifForIdeaScene', () => {
  it('puts the two pedidos on a beat that names a recipe versus seventh grade', () => {
    expect(
      motifForIdeaScene(
        'Un párrafo con una idea. Eso no es una receta ni un ensayo con tesis.',
        3,
      ),
    ).toBe('pedido');
  });

  it('uses the clock when the hour is 45 minutes', () => {
    expect(motifForIdeaScene('Pide bloques que sumen 45 minutos.', 0)).toBe('clock');
  });

  it('uses the sheet when the first draft is not ready to photocopy', () => {
    expect(
      motifForIdeaScene(
        'El primer resultado es un borrador. El primer tiro no se fotocopia.',
        1,
      ),
    ).toBe('sheet');
  });

  it('does not put a leftover table on the two-hour planning beat', () => {
    expect(
      motifForIdeaScene(
        'Si llegas de la jornada y te quedan dos horas de planear, el modelo te arma un borrador. Tú decides qué se fotocopia.',
        1,
      ),
    ).toBeNull();
  });

  it('uses the two pedidos when the beat shows a vague reading ask', () => {
    expect(
      motifForIdeaScene(
        'Veamos qué pasa si pides algo como: «Hazme una lectura de séptimo, bien creativa.»',
        0,
      ),
    ).toBe('pedido');
  });

  it('leaves the thesis beat without a board', () => {
    expect(
      motifForIdeaScene(
        'Esto no va de inteligencia artificial. Va de pedirle a un modelo una hoja. Él escribe el borrador. Tú decides qué se fotocopia.',
        0,
      ),
    ).toBeNull();
  });
});
