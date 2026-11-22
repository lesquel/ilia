/**
 * The student's home, as decisions on data the app already has.
 *
 * Plain TypeScript: it imports domain files only, never a feature's index, so
 * it runs under Vitest without React Native.
 */

import { firstGivenName } from '@/features/auth/domain/app-location';
import { nextOpenSyllabusItem, type Module } from '@/features/catalog/domain/entities';
import type { Certificate } from '@/features/certificates/domain/entities';
import { hasStarted, type EnrolledCourse } from '@/features/enrollment/domain/entities';
import { primaryCourseToContinue } from '@/features/enrollment/domain/resume';
import type { SubmissionHistoryItem } from '@/features/lab/domain/submission-history';

/** The course the hero shows: the same rule "Mis cursos" uses. */
export const courseToContinue = primaryCourseToContinue;

export interface HeroView {
  /** Whether the button opens a lesson or the module's practice. */
  kind: 'lesson' | 'activity';
  courseTitle: string;
  positionLabel: string;
  title: string;
  moduleTitle: string;
  countLabel: string;
  percentLabel: string;
  percentage: number;
  primaryLabel: string;
  primaryHref: string;
  syllabusHref: string;
}

/**
 * What the hero card says about the course being continued.
 *
 * `modules` is the syllabus when it has loaded. Until then the position comes
 * from the lessons done, which is the same number for a course taken in order.
 */
export function heroFor(enrolled: EnrolledCourse, modules: readonly Module[] | null): HeroView {
  const { course, progress } = enrolled;
  const syllabusHref = `/catalog/${course.slug}`;
  const open = modules
    ? nextOpenSyllabusItem([...modules], progress.completedLessonIds, progress.passedActivityIds)
    : undefined;

  const isActivity = open ? open.kind === 'activity' : progress.nextLesson === null;
  const lessonId = open?.kind === 'lesson' ? open.id : progress.nextLesson?.lessonId;
  const title = open?.title ?? progress.nextLesson?.lessonTitle ?? '';

  const moduleTitle =
    (open && modules
      ? modules.find(
          (module) =>
            module.lessons.some((lesson) => lesson.id === open.id) ||
            module.activities.some((activity) => activity.id === open.id),
        )?.title
      : undefined) ??
    progress.nextLesson?.moduleTitle ??
    '';

  const total = progress.totalLessons;
  const position = lessonPosition(lessonId, modules) ?? Math.min(progress.completedLessons + 1, total);

  const primaryHref = isActivity
    ? open
      ? `/lab/${open.id}`
      : syllabusHref
    : lessonId
      ? `/catalog/${course.slug}/lessons/${lessonId}`
      : syllabusHref;

  return {
    kind: isActivity ? 'activity' : 'lesson',
    courseTitle: course.title,
    positionLabel: isActivity ? 'Práctica' : `Lección ${position} de ${total}`,
    title,
    moduleTitle,
    countLabel: `${progress.completedLessons} de ${total} lecciones`,
    percentLabel: `${Math.round(progress.percentage)} %`,
    percentage: progress.percentage,
    primaryLabel: isActivity ? 'Hacer la práctica' : 'Continuar la lección',
    primaryHref,
    syllabusHref,
  };
}

/** 1-based place of a lesson in the whole course, or null when unknown. */
function lessonPosition(
  lessonId: string | undefined,
  modules: readonly Module[] | null,
): number | null {
  if (!lessonId || !modules) return null;
  const ids = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const index = ids.indexOf(lessonId);
  return index >= 0 ? index + 1 : null;
}

export interface CourseCardView {
  title: string;
  initial: string;
  nextLine: string;
  countLabel: string;
  percentage: number;
  href: string;
}

export function courseCardFor(enrolled: EnrolledCourse): CourseCardView {
  const { course, progress } = enrolled;
  const lessonsDone = progress.isComplete && !progress.isFinished;

  const nextLine = progress.isFinished
    ? 'Terminado'
    : lessonsDone
      ? 'Falta la práctica'
      : progress.nextLesson
        ? `Sigue: ${progress.nextLesson.lessonTitle}`
        : '';

  return {
    title: course.title,
    initial: courseInitial(course.title),
    nextLine,
    countLabel: lessonsDone
      ? 'Lecciones listas'
      : `${progress.completedLessons} de ${progress.totalLessons} lecciones`,
    percentage: progress.percentage,
    href: `/catalog/${course.slug}`,
  };
}

/** "IA" stays "IA"; any other title gives its first letter. */
export function courseInitial(title: string): string {
  const first = title.trim().split(/\s+/)[0] ?? '';
  if (!first) return '·';
  if (first.length <= 3 && first === first.toLocaleUpperCase('es') && /\p{L}/u.test(first)) {
    return first;
  }
  return first.charAt(0).toLocaleUpperCase('es');
}

export interface NearestCertificateView {
  courseTitle: string;
  href: string;
  remainingLine: string;
}

/**
 * The started course without a valid certificate that is closest to one.
 *
 * Certificates carry the course title, not its id, so that is the match.
 */
export function nearestCertificate(
  enrolled: readonly EnrolledCourse[],
  certificates: readonly Certificate[],
): NearestCertificateView | undefined {
  const held = new Set(
    certificates.filter((item) => item.status === 'valid').map((item) => item.courseTitle),
  );
  const candidate = enrolled
    .filter((row) => hasStarted(row.progress) && !held.has(row.course.title))
    .sort((a, b) => b.progress.percentage - a.progress.percentage)[0];
  if (!candidate) return undefined;

  const { progress, course } = candidate;
  return {
    courseTitle: course.title,
    href: `/catalog/${course.slug}`,
    remainingLine: remainingLine(
      Math.max(0, progress.totalLessons - progress.completedLessons),
      progress.pendingActivityCount,
    ),
  };
}

function remainingLine(lessons: number, practices: number): string {
  const parts: string[] = [];
  if (lessons > 0) parts.push(lessons === 1 ? '1 lección' : `${lessons} lecciones`);
  if (practices > 0) parts.push(practices === 1 ? 'una práctica' : `${practices} prácticas`);
  if (parts.length === 0) return 'Ya cumpliste todo. Emítelo desde el curso.';

  const singular = lessons + practices === 1;
  return `Te ${singular ? 'falta' : 'faltan'} ${parts.join(' y ')} para tenerlo.`;
}

export interface GradedAttempt {
  current: SubmissionHistoryItem;
  /** The scored attempt before it on the same activity, if there was one. */
  previous: SubmissionHistoryItem | undefined;
}

/** `items` sorted newest first, as `useGlobalSubmissionHistory` returns them. */
export function latestGradedAttempt(
  items: readonly SubmissionHistoryItem[],
): GradedAttempt | undefined {
  const scored = items.filter((item) => item.submission.status === 'scored');
  const current = scored[0];
  if (!current) return undefined;

  const previous = scored
    .filter(
      (item) =>
        item.activityId === current.activityId &&
        item.submission.attempt < current.submission.attempt,
    )
    .sort((a, b) => b.submission.attempt - a.submission.attempt)[0];

  return { current, previous };
}

export function labDeltaLine(
  score: number,
  previousScore: number | null,
  previousAttempt: number | null,
): string | null {
  if (previousScore === null || previousAttempt === null) return null;
  const delta = Math.round(score - previousScore);
  if (delta === 0) return `Igual que en el intento ${previousAttempt}`;
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${Math.abs(delta)} respecto al intento ${previousAttempt}`;
}

export function greetingFor(fullName: string, hasCourseToContinue: boolean): string {
  const hello = fullName.trim() ? `Hola, ${firstGivenName(fullName)}.` : 'Hola.';
  return hasCourseToContinue ? `${hello} Te quedaste aquí.` : hello;
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Spelled out by hand: Hermes on Android ships without full Intl data. */
export function todayLabel(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** Lía's one line, taken from what the hero already points at. */
export function liaLineFor(hero: HeroView | undefined): string {
  if (!hero) return 'Terminaste lo que tenías abierto. En el catálogo hay más para seguir.';
  if (hero.kind === 'activity') {
    return hero.title
      ? `Ya viste las lecciones. Falta la práctica: «${hero.title}».`
      : 'Ya viste las lecciones. Falta la práctica del curso.';
  }
  return `Lo que sigue es «${hero.title}». Retomas justo donde lo dejaste.`;
}
