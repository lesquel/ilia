/** One segment of the lesson's top bar. */
export type LessonStepState = 'done' | 'current' | 'next';

/**
 * The course's lessons as the top bar shows them.
 *
 * "Done" means completed, not merely earlier: a teacher who skipped a lesson
 * should see the gap, not a bar that pretends she read it.
 */
export function lessonStepStates({
  lessonIds,
  currentLessonId,
  completedLessonIds,
}: {
  lessonIds: readonly string[];
  currentLessonId: string;
  completedLessonIds: readonly string[];
}): LessonStepState[] {
  return lessonIds.map((id) => {
    if (id === currentLessonId) return 'current';
    return completedLessonIds.includes(id) ? 'done' : 'next';
  });
}

/** Before the course and its progress arrive, the position is all there is. */
export function lessonStepStatesByPosition(position: number, total: number): LessonStepState[] {
  if (total <= 0 || position < 1 || position > total) return [];
  return Array.from({ length: total }, (_, index) => {
    if (index + 1 < position) return 'done';
    return index + 1 === position ? 'current' : 'next';
  });
}
