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
