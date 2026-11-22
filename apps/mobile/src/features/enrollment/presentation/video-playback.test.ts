import { describe, expect, it, vi } from 'vitest';

import { pauseLessonVideo, shouldShowPoster } from './video-playback';

describe('pauseLessonVideo', () => {
  it('stops the player when its lesson screen loses focus', () => {
    const player = { pause: vi.fn() };

    pauseLessonVideo(player);

    expect(player.pause).toHaveBeenCalledOnce();
  });
});

describe('shouldShowPoster', () => {
  const fresh = { posterUrl: 'https://cdn/x.jpg', hasStarted: false, posterFailed: false, offersResume: false };

  it('shows the poster before the first play', () => {
    expect(shouldShowPoster(fresh)).toBe(true);
  });

  it('hides it once the video has started', () => {
    expect(shouldShowPoster({ ...fresh, hasStarted: true })).toBe(false);
  });

  it('hides it when there is no poster or it did not load', () => {
    expect(shouldShowPoster({ ...fresh, posterUrl: null })).toBe(false);
    expect(shouldShowPoster({ ...fresh, posterFailed: true })).toBe(false);
  });

  it('gives way to the resume choice', () => {
    expect(shouldShowPoster({ ...fresh, offersResume: true })).toBe(false);
  });
});
