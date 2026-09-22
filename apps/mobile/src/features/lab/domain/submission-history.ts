import type { Submission } from './entities';

export interface SubmissionHistoryItem {
  submission: Submission;
  activityId: string;
  activityTitle: string;
  courseSlug: string;
  courseTitle: string;
}

/**
 * Flat list for mockup #12 — no global `/lab/submissions` endpoint, so the client
 * merges per-activity lists from enrolled courses only.
 */
export function sortSubmissionHistory(
  items: readonly SubmissionHistoryItem[],
): SubmissionHistoryItem[] {
  return [...items].sort((a, b) => {
    const courseCmp = a.courseTitle.localeCompare(b.courseTitle, 'es');
    if (courseCmp !== 0) return courseCmp;
    const activityCmp = a.activityTitle.localeCompare(b.activityTitle, 'es');
    if (activityCmp !== 0) return activityCmp;
    return b.submission.attempt - a.submission.attempt;
  });
}
