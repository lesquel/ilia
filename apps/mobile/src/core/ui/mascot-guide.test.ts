import { describe, expect, it } from 'vitest';

import { facingStillForMood } from './mascot-facing-still';

describe('facingStillForMood', () => {
  it('does not use the mirrored listen or talk wing', () => {
    expect(facingStillForMood('listen')).toBe('done');
    expect(facingStillForMood('talk')).toBe('think');
    expect(facingStillForMood('explain')).toBe('think');
  });

  it('keeps write, think and show as themselves', () => {
    expect(facingStillForMood('write')).toBe('write');
    expect(facingStillForMood('think')).toBe('think');
    expect(facingStillForMood('show')).toBe('show');
    expect(facingStillForMood('done')).toBe('done');
  });
});
