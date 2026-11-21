/**
 * Turns a parsed lesson into beats a teacher can play, like a video
 * without a file: one idea, then a lab, then the next idea.
 */

import { motifForIdeaScene } from './idea-art-motif';
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

/** A question beat stays put until the teacher picks the option the lesson marks. */
export function sceneWaitsForBestAnswer(scene: LessonScene): boolean {
  return scene.type === 'narrate' && scene.block.type === 'question';
}

export function sceneKindLabel(scene: LessonScene): string {
  switch (scene.type) {
    case 'narrate':
      return scene.block.type === 'question' ? 'Piénsalo' : 'Idea';
    case 'lab':
      return 'El pedido';
    case 'compare':
      return 'Los dos';
    case 'reveal':
      return 'Ejemplo';
  }
}

const SHORT_IDEA_CHARACTER_LIMIT = 260;

export function shouldShowIdeaArt(scene: LessonScene): boolean {
  if (scene.type !== 'narrate' || scene.block.type !== 'paragraph') {
    return false;
  }

  const plainText = scene.block.inlines
    .map((part) => part.text)
    .join('')
    .trim();

  if (plainText.length === 0 || plainText.length > SHORT_IDEA_CHARACTER_LIMIT) {
    return false;
  }

  return motifForIdeaScene(plainText) !== null;
}

export function ideaScenePlainText(scene: Extract<LessonScene, { type: 'narrate' }>): string {
  if (scene.block.type !== 'paragraph') {
    return '';
  }

  return scene.block.inlines.map((part) => part.text).join('');
}
