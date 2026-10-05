import type { CourseSummary, LessonKind } from '@/features/catalog/domain/entities';

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
  /** Actividades ya aprobadas, con la misma regla que usa el certificado. */
  passedActivityIds: string[];
  /** Practices still to pass. `isComplete` counts lessons only; see `isFinished`. */
  pendingActivityCount: number;
  /** Lessons done and no practice pending: the only "terminaste" the UI may claim. */
  isFinished: boolean;
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
  if (progress.isFinished) return 'Repasar el curso';
  if (progress.isComplete) return 'Hacer la práctica';
  return hasStarted(progress) ? 'Continuar' : 'Empezar';
}

export function isLessonCompleted(progress: CourseProgress, lessonId: string): boolean {
  return progress.completedLessonIds.includes(lessonId);
}

export interface LessonView {
  lessonId: string;
  title: string;
  moduleTitle: string;
  kind: LessonKind;
  durationSeconds: number;
  body: string;
  resourceRef: string | null;
  /**
   * A temporary URL for the media, minted by the API after it checked the
   * enrolment. Never built here: a client that composes storage keys is a
   * client that can ask for someone else's lesson.
   */
  mediaUrl: string | null;
  isCompleted: boolean;
  position: number;
  totalLessons: number;
  previous: NextLesson | null;
  next: NextLesson | null;
}
