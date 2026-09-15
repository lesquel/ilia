/**
 * Turns a parsed lesson into beats a teacher can play, like a video
 * without a file: one idea, then a lab, then the next idea.
 */

import type { LessonBlock, WorkedExample } from './lesson-body';

export type LessonScene =
  | { type: 'narrate'; block: LessonBlock }
  | { type: 'lab'; prompt: WorkedExample; result: WorkedExample }
  | { type: 'compare'; weak: WorkedExample; strong: WorkedExample }
  | { type: 'reveal'; example: WorkedExample };

export function scenesFromLesson(blocks: LessonBlock[]): LessonScene[] {
  return blocks.map((block) => {
    if (block.type === 'promptResult') {
      return { type: 'lab', prompt: block.prompt, result: block.result };
    }
    if (block.type === 'examplePair') {
      return { type: 'compare', weak: block.weak, strong: block.strong };
    }
    if (block.type === 'example') {
      return { type: 'reveal', example: block.example };
    }
    return { type: 'narrate', block };
  });
}

export function sceneKindLabel(scene: LessonScene): string {
  switch (scene.type) {
    case 'narrate':
      return 'La idea';
    case 'lab':
      return 'El laboratorio';
    case 'compare':
      return 'Compara';
    case 'reveal':
      return 'El ejemplo';
  }
}
