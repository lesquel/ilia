import {
  nextOpenSyllabusItem,
  type Module,
} from '@/features/catalog/domain/entities';

import { hasStarted, type CourseProgress, type EnrolledCourse } from './entities';

export interface ResumeTarget {
  href: string;
  /** One line under the title: module · item · instructor */
  contextLine: string;
}

/**
 * Which enrolled course the student should see first on "Mis cursos".
 *
 * Prefer an in-progress course they already started; among those, the one furthest
 * along. That matches the mockup dashboard card, which highlights a single active
 * course rather than the whole list.
 */
export function primaryCourseToContinue(
  enrolled: readonly EnrolledCourse[],
): EnrolledCourse | undefined {
  const inProgress = enrolled.filter((row) => !row.progress.isFinished);
  if (inProgress.length === 0) return undefined;

  const started = inProgress.filter((row) => hasStarted(row.progress));
  const pool = started.length > 0 ? started : inProgress;

  return [...pool].sort((a, b) => b.progress.percentage - a.progress.percentage)[0];
}

export function resumeTargetForCourse(
  courseSlug: string,
  instructorName: string,
  modules: readonly Module[],
  progress: CourseProgress,
): ResumeTarget {
  const open = nextOpenSyllabusItem(
    [...modules],
    progress.completedLessonIds,
    progress.passedActivityIds,
  );

  const href =
    open?.kind === 'activity'
      ? `/lab/${open.id}`
      : open
        ? `/catalog/${courseSlug}/lessons/${open.id}`
        : `/catalog/${courseSlug}`;

  const moduleForOpen = open
    ? modules.find(
        (module) =>
          module.lessons.some((lesson) => lesson.id === open.id) ||
          module.activities.some((activity) => activity.id === open.id),
      )
    : undefined;

  const moduleTitle = moduleForOpen?.title ?? progress.nextLesson?.moduleTitle ?? '';
  const itemTitle = open?.title ?? progress.nextLesson?.lessonTitle ?? '';
  const instructor = instructorName.trim();

  const parts = [moduleTitle, itemTitle, instructor].filter(Boolean);
  const contextLine = parts.join(' · ');

  return { href, contextLine };
}
