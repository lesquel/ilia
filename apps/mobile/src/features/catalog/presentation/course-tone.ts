import { coverToneForCourseSlug } from './course-cover-craft';

/** A course's color, from its cover to its lessons (proposal A). */
export type CourseAccent = {
  /** Strong color: buttons, progress, the current step. */
  ink: string;
  /** Pale wash: hero bands, the current row, Lía's bubbles. */
  wash: string;
  /** In between: upcoming steps, soft borders. */
  mid: string;
};

/**
 * The course's own color, or the app's accent for a course that has none.
 *
 * One source for every screen, so the color a teacher sees on the cover is
 * the same on the course page, in the lesson and on the lab result.
 */
export function courseAccent(slug: string | undefined, fallback: CourseAccent): CourseAccent {
  const tone = slug ? coverToneForCourseSlug(slug) : undefined;
  return tone ? { ink: tone.ink, wash: tone.wash, mid: tone.mid } : fallback;
}
