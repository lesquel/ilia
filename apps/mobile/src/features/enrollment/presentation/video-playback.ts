import type { SubtitleTrack, VideoPlayer } from 'expo-video';

interface PausablePlayer {
  pause(): void;
}

type SeekablePlayer = Pick<VideoPlayer, 'currentTime'>;
type SubtitlePlayer = Pick<VideoPlayer, 'subtitleTrack'>;

export function seekLessonVideo(player: SeekablePlayer, seconds: number): void {
  player.currentTime = Math.max(0, seconds);
}

export function selectLessonSubtitle(player: SubtitlePlayer, track: SubtitleTrack | null): void {
  player.subtitleTrack = track;
}

/** Pause the lesson media when its route is no longer the active screen. */
export function pauseLessonVideo(player: PausablePlayer): void {
  player.pause();
}
