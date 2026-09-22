import { describe, expect, it } from 'vitest';

import type { Submission } from './entities';
import { sortSubmissionHistory, type SubmissionHistoryItem } from './submission-history';

function item(
  courseTitle: string,
  activityTitle: string,
  attempt: number,
): SubmissionHistoryItem {
  const submission: Submission = {
    id: `${courseTitle}-${attempt}`,
    activityId: 'a',
    attempt,
    status: 'scored',
    prompt: 'p',
    failureReason: null,
  };
  return {
    submission,
    activityId: 'a',
    activityTitle,
    courseSlug: 'slug',
    courseTitle,
  };
}

describe('sortSubmissionHistory', () => {
  it('orders by course, activity, then attempt descending', () => {
    const sorted = sortSubmissionHistory([
      item('Beta', 'Act', 1),
      item('Alfa', 'Z', 2),
      item('Alfa', 'A', 3),
    ]);
    expect(sorted.map((row) => row.courseTitle)).toEqual(['Alfa', 'Alfa', 'Beta']);
    expect(sorted[0]?.submission.attempt).toBe(3);
  });
});
