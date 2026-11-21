import type { MascotMood, MascotMotion } from '@/core/ui/mascot-facing-still';

export type PageDirection = 'forward' | 'backward';
export type LabMotionPhase = 'idle' | 'composing' | 'processing' | 'revealed';

export function labMascotMotion(phase: LabMotionPhase): MascotMotion {
  if (phase === 'composing') return 'write';
  if (phase === 'processing') return 'think';
  if (phase === 'revealed') return 'reveal';
  return 'none';
}

export function quizFeedbackDelay(questionIndex: number): number {
  return Math.min(4, Math.max(0, questionIndex)) * 55;
}

export function quizMascotReaction(passed: boolean): {
  mood: Extract<MascotMood, 'celebrate' | 'encourage'>;
  motion: Extract<MascotMotion, 'celebrate' | 'reveal'>;
} {
  return passed
    ? { mood: 'celebrate', motion: 'celebrate' }
    : { mood: 'encourage', motion: 'reveal' };
}

export function pageEntryOffset(direction: PageDirection): number {
  return direction === 'forward' ? 14 : -14;
}
