export type MascotMood =
  | 'explain'
  | 'write'
  | 'think'
  | 'show'
  | 'talk'
  | 'done'
  | 'listen'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'celebrate';

export type MascotMotion =
  | 'none'
  | 'page-forward'
  | 'page-back'
  | 'celebrate'
  | 'shake'
  | 'write'
  | 'think'
  | 'reveal'
  | 'droop';

export type FacingStill = 'done' | 'think' | 'write' | 'show' | 'sad' | 'happy' | 'angry' | 'celebrate';

/**
 * listen / talk / explain flip the wing to the other side. That reads as
 * her turning around. Keep her facing us.
 */
export function facingStillForMood(mood: MascotMood): FacingStill {
  if (mood === 'write') return 'write';
  if (mood === 'sad') return 'sad';
  if (mood === 'happy') return 'happy';
  if (mood === 'angry') return 'angry';
  if (mood === 'celebrate') return 'celebrate';
  if (mood === 'think' || mood === 'talk' || mood === 'explain') return 'think';
  if (mood === 'show') return 'show';
  return 'done';
}
