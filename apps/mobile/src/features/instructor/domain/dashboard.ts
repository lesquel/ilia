import {
  percentOf,
  type AuthoredCourse,
  type CourseInsights,
  type ReviewItem,
} from './entities';

/** The instructor dashboard's derived figures. Plain TypeScript, no React. */

export function instructorGreeting(fullName: string | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? `Hola, ${first}.` : 'Hola.';
}

/** The mean of the marks that exist, rounded; null when none does. */
export function averageScore(items: ReviewItem[]): number | null {
  const scores = items
    .map((row) => row.effectiveTotal)
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * What is worth a human look first.
 *
 * Only marked submissions nobody has corrected yet; the failed ones lead,
 * because a wrong fail is the mark that costs a teacher their certificate.
 * Within each group the API's order is kept.
 */
export function reviewQueue(items: ReviewItem[], limit: number): ReviewItem[] {
  const open = items.filter((row) => row.effectiveTotal !== null && !row.wasOverridden);
  return [...open.filter((row) => !row.passed), ...open.filter((row) => row.passed)].slice(
    0,
    limit,
  );
}

export type ScoreTone = 'success' | 'warning' | 'neutral';

export function scoreTone(row: Pick<ReviewItem, 'effectiveTotal' | 'passed'>): ScoreTone {
  if (row.effectiveTotal === null) return 'neutral';
  return row.passed ? 'success' : 'warning';
}

export interface LessonReach {
  key: string;
  /** Position in the syllabus, from 1. */
  number: number;
  title: string;
  /** Share of the enrolled who completed it, 0–100. */
  percent: number;
}

/** Each lesson's completions as a share of the enrolled, in syllabus order. */
export function lessonReach(insights: CourseInsights): LessonReach[] {
  if (insights.enrolled <= 0) return [];
  return insights.lessons.map((lesson, index) => ({
    key: lesson.lessonId,
    number: index + 1,
    title: lesson.title,
    percent: percentOf(lesson.completed, insights.enrolled),
  }));
}

export interface Drop {
  /** Index into the reach list. */
  index: number;
  number: number;
  from: number;
  to: number;
  drop: number;
}

/**
 * The lesson that loses the most people against the one before it.
 *
 * Measured between lessons only: who never started is a different problem,
 * and the roster already counts them. The first of two equal drops wins.
 */
export function biggestDrop(reach: LessonReach[]): Drop | null {
  let best: Drop | null = null;
  for (let index = 1; index < reach.length; index += 1) {
    const previous = reach[index - 1];
    const current = reach[index];
    if (!previous || !current) continue;
    const drop = previous.percent - current.percent;
    if (drop > 0 && (best === null || drop > best.drop)) {
      best = { index, number: current.number, from: previous.percent, to: current.percent, drop };
    }
  }
  return best;
}

export function dropSentence(drop: Drop): string {
  return `La lección ${drop.number} es donde más gente se detiene: llega el ${drop.to} % de los inscritos, ${drop.drop} puntos menos que a la anterior.`;
}

/** The course whose numbers the dashboard shows. */
export function pickDashboardCourse(
  courses: AuthoredCourse[],
  chosenId: string | null,
): AuthoredCourse | null {
  return (
    courses.find((course) => course.id === chosenId) ??
    courses.find((course) => course.status === 'published') ??
    courses[0] ??
    null
  );
}

/** A quick reason added to the justification, once. */
export function quickReasonAppended(current: string, reason: string): string {
  const text = current.trim();
  if (text.includes(reason)) return text;
  return text ? `${text} ${reason}` : reason;
}
