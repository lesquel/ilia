import { sortCoursesAlongLearningPath, type CourseSummary } from './entities';

/**
 * What a catalog card knows about the teacher's progress in its course.
 *
 * The catalog cannot import the enrollment feature, so this is its own shape:
 * the route reads the enrolments and maps them here.
 */
export interface CatalogProgress {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  /** Null once no lesson is left. */
  nextLessonTitle: string | null;
  /** Every lesson done; a practice may still be pending. */
  lessonsDone: boolean;
  /** Lessons done and no practice pending. */
  isFinished: boolean;
}

/** An enrolment as the enrollment feature lists it, typed structurally. */
export interface EnrolledCourseLike {
  course: CourseSummary;
  progress: {
    percentage: number;
    completedLessons: number;
    totalLessons: number;
    isComplete: boolean;
    isFinished: boolean;
    nextLesson: { lessonTitle: string } | null;
  };
}

export function catalogProgressBySlug(
  rows: readonly EnrolledCourseLike[],
): Record<string, CatalogProgress> {
  const map: Record<string, CatalogProgress> = {};
  for (const { course, progress } of rows) {
    map[course.slug] = {
      percentage: progress.percentage,
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      nextLessonTitle: progress.nextLesson?.lessonTitle ?? null,
      lessonsDone: progress.isComplete,
      isFinished: progress.isFinished,
    };
  }
  return map;
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');
}

/** The catalog's search, for lists it filters itself. */
export function matchesCourseQuery(
  course: Pick<CourseSummary, 'title' | 'summary'>,
  query: string | undefined,
): boolean {
  const needle = fold(query?.trim() ?? '');
  if (!needle) return true;
  return fold(course.title).includes(needle) || fold(course.summary).includes(needle);
}

/**
 * The "En curso" filter: enrolled and not finished.
 *
 * It comes from the enrolments and not from the loaded catalog pages, so a
 * course on a page not fetched yet still shows up.
 */
export function coursesInProgress(
  rows: readonly EnrolledCourseLike[],
  query?: string,
): CourseSummary[] {
  return sortCoursesAlongLearningPath(
    rows
      .filter((row) => !row.progress.isFinished)
      .map((row) => row.course)
      .filter((course) => matchesCourseQuery(course, query)),
  );
}

/** The line above the card's progress bar. */
export function catalogProgressLine(progress: CatalogProgress): string {
  if (progress.isFinished) return 'Curso terminado';
  if (progress.nextLessonTitle) return `Sigue: ${progress.nextLessonTitle}`;
  return 'Lecciones listas · falta la práctica';
}

/** The card's call to action. */
export function catalogCallToAction(progress: CatalogProgress | undefined): string {
  if (!progress) return 'Empezar';
  if (progress.isFinished) return 'Repasar el curso';
  if (progress.lessonsDone) return 'Ir a la práctica';
  return 'Continuar';
}
