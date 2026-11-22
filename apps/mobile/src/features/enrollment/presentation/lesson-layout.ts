/**
 * The lesson's one column. The top bar, the video, the scene dots, the text
 * and the step buttons all share it, so on a wide screen they line up under
 * each other instead of a centred video above full-width text.
 */
export const LESSON_COLUMN_MAX_WIDTH = 860;

export const lessonColumn = {
  width: '100%',
  maxWidth: LESSON_COLUMN_MAX_WIDTH,
  alignSelf: 'center',
} as const;

/**
 * On a wide screen a studio lesson splits in two: the scene on the left and
 * Lía's panel on the right. Both halves share this wider column.
 */
export const LESSON_WIDE_COLUMN_MAX_WIDTH = 1320;

export const lessonWideColumn = {
  width: '100%',
  maxWidth: LESSON_WIDE_COLUMN_MAX_WIDTH,
  alignSelf: 'center',
} as const;

/** Lía's side panel next to the scene. */
export const LESSON_LIA_PANEL_WIDTH = 380;
