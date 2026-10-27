import { describe, expect, it, vi } from 'vitest';

import { pauseLessonVideo } from './video-playback';

describe('pauseLessonVideo', () => {
  it('stops the player when its lesson screen loses focus', () => {
    const player = { pause: vi.fn() };

    pauseLessonVideo(player);

    expect(player.pause).toHaveBeenCalledOnce();
  });
});
