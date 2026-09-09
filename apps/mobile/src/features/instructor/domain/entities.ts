import type { Level } from '@/features/catalog/domain/entities';

/** Instructor domain. Plain TypeScript, shared by all platforms. */

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface AuthoredCourse {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  level: Level;
  status: CourseStatus;
  moduleCount: number;
  lessonCount: number;
  durationSeconds: number;
  publishedAt: string | null;
  /**
   * What still blocks publication.
   *
   * Present even when the course is already live, so an instructor editing a
   * published course learns they broke it the moment it happens — not the next
   * time they try to publish.
   */
  publishBlockers: string[];
}

export interface ReviewItem {
  submissionId: string;
  activityTitle: string;
  studentName: string;
  attempt: number;
  prompt: string;
  submittedAt: string | null;
  total: number | null;
  effectiveTotal: number | null;
  passed: boolean;
  wasOverridden: boolean;
}

export interface RosterEntry {
  userId: string;
  fullName: string;
  email: string;
  enrolledAt: string | null;
  cohortName: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  percentage: number;
  lastActivityAt: string | null;
}

export const STATUS_LABELS: Record<CourseStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Retirado',
};

/** Turns a title into a URL-safe slug, ASCII only. */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      // Truncate before trimming, not after. Cutting at 160 can land on a
      // separator, and a trailing hyphen is rejected by the API's slug rule —
      // turning a long course title into a 400 the instructor cannot explain.
      .slice(0, 160)
      .replace(/^-+|-+$/g, '')
  );
}

export function canPublish(course: AuthoredCourse): boolean {
  return course.publishBlockers.length === 0 && course.status !== 'published';
}
