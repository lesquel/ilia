interface PausablePlayer {
  pause(): void;
}

/** Pause the lesson media when its route is no longer the active screen. */
export function pauseLessonVideo(player: PausablePlayer): void {
  player.pause();
}
