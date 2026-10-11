import { describe, expect, it } from 'vitest';

import type { Submission } from './entities';
import { sortSubmissionHistory, type SubmissionHistoryItem } from './submission-history';

function item(
  courseTitle: string,
  activityTitle: string,
  attempt: number,
  createdAt: string | null = null,
): SubmissionHistoryItem {
  const submission: Submission = {
    id: `${courseTitle}-${attempt}`,
    activityId: 'a',
    attempt,
    status: 'scored',
    prompt: 'p',
    failureReason: null,
    createdAt,
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
  it('orders newest submissions first, then attempt descending when timestamps match', () => {
    const sorted = sortSubmissionHistory([
      item('Beta', 'Act', 1, '2026-10-01T10:00:00Z'),
      item('Alfa', 'Z', 2, '2026-10-03T10:00:00Z'),
      item('Alfa', 'A', 3, '2026-10-03T10:00:00Z'),
    ]);
    expect(sorted.map((row) => row.courseTitle)).toEqual(['Alfa', 'Alfa', 'Beta']);
    expect(sorted[0]?.submission.attempt).toBe(3);
  });
});
