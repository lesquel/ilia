import { describe, expect, it } from 'vitest';

import { parseLessonBody } from './lesson-body';
import {
  sceneKindLabel,
  sceneWaitsForBestAnswer,
  scenesFromLesson,
  shouldShowIdeaArt,
} from './lesson-scenes';

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
    expect(sceneKindLabel(scenes[2]!)).toBe('El pedido');
    const lab = scenes[2];
    if (lab?.type !== 'lab') throw new Error('expected lab');
    expect(lab.prompt.title).toContain('hora');
    expect(lab.result.title.toLocaleLowerCase('es')).toContain('esperamos');
  });
});

describe('sceneWaitsForBestAnswer', () => {
  it('holds the lesson on a question and lets every other beat move on', () => {
    const scenes = scenesFromLesson(
      parseLessonBody(
        'Una idea.\n\n' +
          ':::pregunta ¿Qué sabe Gemini de tu curso?\n' +
          '- [ ] Lo suficiente.\n  No.\n' +
          '- [x] Casi nada.\n  Se lo escribes tú.\n' +
          ':::\n',
      ),
    );

    expect(scenes.map(sceneWaitsForBestAnswer)).toEqual([false, true]);
  });
});

describe('shouldShowIdeaArt', () => {
  it('shows art only when the board teaches the beat, and hides it on a lab', () => {
    const blocks = parseLessonBody(
      'Eso no es una receta ni un ensayo con tesis.\n\n' +
        ':::ejemplo Prompt\nEres docente de séptimo.\n:::\n\n' +
        ':::ejemplo Esperamos: la hoja\n| # | Consigna |\n| 1 | 1/2 + 1/4 |\n:::',
    );
    const scenes = scenesFromLesson(blocks);

    expect(shouldShowIdeaArt(scenes[0]!)).toBe(true);
    expect(shouldShowIdeaArt(scenes[1]!)).toBe(false);
  });

  it('hides art when a short idea has no board that would teach it', () => {
    const scenes = scenesFromLesson(
      parseLessonBody(
        'Si llegas de la jornada y te quedan dos horas de planear, el modelo te arma un borrador.',
      ),
    );

    expect(shouldShowIdeaArt(scenes[0]!)).toBe(false);
  });

  it('hides art when the idea is a long paragraph', () => {
    const longIdea =
      'Hoy vas a ver por qué un pedido corto sale genérico, cómo se pide ' +
      'con rol, aula, tarea y formato, cómo se mejora el primer borrador, ' +
      'qué pasa si no dices los 45 minutos y por qué el modelo rellena ' +
      'con un promedio de internet cada hueco que dejas. Al final escribes ' +
      'el prompt de tu clase. No hay examen. La evidencia es ese prompt.';
    const scenes = scenesFromLesson(parseLessonBody(longIdea));

    expect(shouldShowIdeaArt(scenes[0]!)).toBe(false);
  });
});
