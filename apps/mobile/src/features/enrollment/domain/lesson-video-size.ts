/** Room the lesson needs below and above the video on a wide screen: the app
 * bar, the lesson bar, the scene dots, the first lines of the idea text and
 * the step buttons. */
const RESERVED_HEIGHT = 470;
const MIN_WIDTH = 480;

/**
 * How wide the lesson video may be.
 *
 * A 16:9 frame as wide as the column pushed the idea text below the fold on a
 * laptop screen, so a teacher scrolled to read what the scene was about. On a
 * wide screen the frame is capped so its height leaves that text in view.
 */
export function lessonVideoMaxWidth({
  windowHeight,
  columnMax,
  isWide,
}: {
  windowHeight: number;
  columnMax: number;
  isWide: boolean;
}): number {
  if (!isWide) return columnMax;
  const fitsHeight = Math.floor(((windowHeight - RESERVED_HEIGHT) * 16) / 9);
  return Math.min(columnMax, Math.max(MIN_WIDTH, fitsHeight));
}
