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
    const aTime = a.submission.createdAt ? Date.parse(a.submission.createdAt) : 0;
    const bTime = b.submission.createdAt ? Date.parse(b.submission.createdAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return b.submission.attempt - a.submission.attempt;
  });
}
