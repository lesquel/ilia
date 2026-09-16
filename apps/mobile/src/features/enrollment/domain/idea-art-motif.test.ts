import { describe, expect, it } from 'vitest';

import { motifForIdeaScene } from './idea-art-motif';

describe('motifForIdeaScene', () => {
  it('uses the pie when the beat is counting slices versus adding fractions', () => {
    expect(
      motifForIdeaScene(
        'Un cuarto más un medio. Eso no es contar cuántos trozos tiene un pastel.',
        3,
      ),
    ).toBe('pie');
  });

  it('uses the clock when the hour is 45 minutes', () => {
    expect(motifForIdeaScene('Pide bloques que sumen 45 minutos.', 0)).toBe('clock');
  });

  it('uses the sheet when the beat is the draft you photocopy', () => {
    expect(
      motifForIdeaScene(
        'Si llegas de la jornada, el modelo te arma un borrador. Tú decides qué se fotocopia.',
        1,
      ),
    ).toBe('sheet');
  });

  it('uses the prompt card when the beat is asking for a sheet', () => {
    expect(
      motifForIdeaScene(
        'Esto no va de inteligencia artificial. Va de pedirle a un modelo una hoja.',
        0,
      ),
    ).toBe('pedido');
  });
});
