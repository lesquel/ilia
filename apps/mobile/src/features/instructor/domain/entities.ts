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

export interface LessonInsight {
  lessonId: string;
  title: string;
  moduleTitle: string;
  /** How many enrolled people completed it. */
  completed: number;
}

export interface ActivityInsight {
  activityId: string;
  title: string;
  moduleTitle: string;
  attempted: number;
  passed: number;
}

export interface DayCount {
  /** ISO date, `YYYY-MM-DD`. */
  day: string;
  count: number;
}

export interface CourseInsights {
  enrolled: number;
  finished: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
  lessons: LessonInsight[];
  activities: ActivityInsight[];
  enrollmentsByDay: DayCount[];
  lastActivityAt: string | null;
}

/** A whole percent, held to 0–100, and 0 when there is nobody to divide by. */
export function percentOf(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((count * 100) / total)));
}

/** How much of its track a bar fills. */
export function barWidth(count: number, total: number): `${number}%` {
  return `${percentOf(count, total)}%`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * "13 oct" from an ISO day or timestamp.
 *
 * Read from the text, not through `Date`: `new Date('2026-10-01')` is midnight
 * UTC, and a device in Ecuador would print the day before.
 */
export function dayLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) return iso;
  return `${Number(match[3])} ${month}`;
}

/**
 * The enrolments in words, when a chart would be a single column.
 *
 * One bar compares nothing; a sentence says the same and is honest about it.
 * Null means either there is nothing to say or there is enough to draw.
 */
export function enrollmentsSentence(days: DayCount[]): string | null {
  const [only] = days;
  if (days.length !== 1 || !only) return null;

  return only.count === 1
    ? `La única inscripción llegó el ${dayLabel(only.day)}.`
    : `Las ${only.count} inscripciones llegaron el ${dayLabel(only.day)}.`;
}

/** The most recent days, so a long-running course still fits one row of columns. */
export function latestDays(days: DayCount[], limit: number): DayCount[] {
  return days.length > limit ? days.slice(days.length - limit) : days;
}

export interface ProgressRow {
  key: string;
  title: string;
  moduleTitle: string;
  count: number;
  isPractice: boolean;
}

/** One row per lesson in syllabus order, then the practices by who passed them. */
export function progressRows(insights: CourseInsights): ProgressRow[] {
  return [
    ...insights.lessons.map((lesson) => ({
      key: lesson.lessonId,
      title: lesson.title,
      moduleTitle: lesson.moduleTitle,
      count: lesson.completed,
      isPractice: false,
    })),
    ...insights.activities.map((activity) => ({
      key: activity.activityId,
      title: activity.title,
      moduleTitle: activity.moduleTitle,
      count: activity.passed,
      isPractice: true,
    })),
  ];
}

export function insightsSummary(insights: CourseInsights): string {
  if (insights.enrolled === 0) return 'Todavía no hay nadie inscrito.';

  const enrolled = `${insights.enrolled} ${insights.enrolled === 1 ? 'inscrito' : 'inscritos'}`;
  const finished = `${insights.finished} ${insights.finished === 1 ? 'terminó' : 'terminaron'}`;
  return `${enrolled} · ${finished} (${insights.completionRate}%)`;
}
