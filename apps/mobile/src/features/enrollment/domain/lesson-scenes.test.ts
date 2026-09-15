import { describe, expect, it } from 'vitest';

import { parseLessonBody } from './lesson-body';
import { sceneKindLabel, scenesFromLesson } from './lesson-scenes';

describe('scenesFromLesson', () => {
  it('turns a prompt-and-result lesson into idea beats plus a lab', () => {
    const blocks = parseLessonBody(
      'El modelo no siente el reloj.\n\n' +
        'Pide bloques que sumen 45.\n\n' +
        ':::ejemplo Prompt de la hora\nEres docente de séptimo. Diseña 45 minutos.\n:::\n\n' +
        ':::ejemplo Esperamos: el plan\n| Tiempo | Momento |\n| 8 min | Apertura |\n:::',
    );

    const scenes = scenesFromLesson(blocks);

    expect(scenes.map((scene) => scene.type)).toEqual(['narrate', 'narrate', 'lab']);
    expect(sceneKindLabel(scenes[2]!)).toBe('El laboratorio');
    const lab = scenes[2];
    if (lab?.type !== 'lab') throw new Error('expected lab');
    expect(lab.prompt.title).toContain('hora');
    expect(lab.result.title.toLocaleLowerCase('es')).toContain('esperamos');
  });
});
