/**
 * Catalog domain. Plain TypeScript, identical on iOS, Android and web.
 */

export const LEVELS = ['beginner', 'intermediate', 'expert'] as const;
export type Level = (typeof LEVELS)[number];

export const LESSON_KINDS = ['video', 'slides', 'text', 'quiz'] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: Level;
  instructorName: string;
  lessonCount: number;
  durationSeconds: number;
}

export interface Lesson {
  id: string;
  title: string;
  kind: LessonKind;
  position: number;
  durationSeconds: number;
  /** Whether there is material to play. Never where it lives. */
  hasMedia: boolean;
}

/** A lab activity, as the syllabus announces it. */
export interface ModuleActivity {
  id: string;
  title: string;
  maxAttempts: number;
}

export interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
  /** What the module ends in. Without these nothing pointed at the exercise. */
  activities: ModuleActivity[];
}

export interface Course extends CourseSummary {
  description: string;
  modules: Module[];
}

export interface CatalogFilters {
  level?: Level;
  query?: string;
}

export interface CoursePage {
  items: CourseSummary[];
  /** Null on the last page. Its presence is the only "is there more" signal. */
  nextCursor: string | null;
}

/**
 * Human-readable duration.
 *
 * Lives in the domain because it is a product decision, not a formatting
 * detail: the whole pitch to a teacher is that a lesson fits in the gap between
 * classes, so "8 min" has to read as small.
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Sin contenido aún';

  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Básico',
  intermediate: 'Intermedio',
  expert: 'Experto',
};

const PATH_ORDER: Record<Level, number> = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

/**
 * The catalog is a route, not a blog. Newest-published-first puts the expert
 * course on the left and the starting course on the right.
 */
export function sortCoursesAlongLearningPath<Course extends { level: Level }>(
  courses: Course[],
): Course[] {
  return [...courses].sort(
    (left, right) => PATH_ORDER[left.level] - PATH_ORDER[right.level],
  );
}

export const LESSON_KIND_LABELS: Record<LessonKind, string> = {
  video: 'Vídeo',
  slides: 'Presentación',
  text: 'Lectura',
  quiz: 'Comprobación',
};
