import type { CourseSummary } from '@/features/catalog/domain/entities';

/** Enrollment and progress domain. Plain TypeScript, shared by all platforms. */

export interface NextLesson {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isComplete: boolean;
  completedLessonIds: string[];
  /** Null once the course is finished — that absence swaps "continuar" for "completado". */
  nextLesson: NextLesson | null;
}

export interface Enrollment {
  id: string;
  courseId: string;
  enrolledAt: string | null;
  cohortId: string | null;
}

export interface EnrolledCourse {
  course: CourseSummary;
  enrolledAt: string | null;
  progress: CourseProgress;
}

export function hasStarted(progress: CourseProgress): boolean {
  return progress.completedLessons > 0;
}

/**
 * What the primary button on a course says.
 *
 * A decision, not a formatting detail: it is the difference between a teacher
 * who knows what happens next and one who has to guess.
 */
export function callToAction(progress: CourseProgress | null): string {
  if (!progress) return 'Inscribirme';
  if (progress.isComplete) return 'Repasar el curso';
  return hasStarted(progress) ? 'Continuar' : 'Empezar';
}

export function isLessonCompleted(progress: CourseProgress, lessonId: string): boolean {
  return progress.completedLessonIds.includes(lessonId);
}
