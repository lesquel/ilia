export type MascotMood =
  | 'explain'
  | 'write'
  | 'think'
  | 'show'
  | 'talk'
  | 'done'
  | 'listen';

export type FacingStill = 'done' | 'think' | 'write' | 'show';

/**
 * listen / talk / explain flip the wing to the other side. That reads as
 * her turning around. Keep her facing us.
 */
export function facingStillForMood(mood: MascotMood): FacingStill {
  if (mood === 'write') return 'write';
  if (mood === 'think' || mood === 'talk' || mood === 'explain') return 'think';
  if (mood === 'show') return 'show';
  return 'done';
}
