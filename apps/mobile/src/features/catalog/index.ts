/** Public entry point of the catalog feature. */

export {
  formatDuration,
  LEVELS,
  LEVEL_LABELS,
  LESSON_KIND_LABELS,
  sortCoursesAlongLearningPath,
  nextCourseAlongLearningPath,
  startingCourseId,
} from './domain/entities';
export type { Course, CourseSummary, Level, LessonKind, Module } from './domain/entities';
export { useCourse, useCourses, catalogKeys } from './application/use-catalog';
export { CourseCard } from './presentation/course-card';
export { courseAccent, type CourseAccent } from './presentation/course-tone';
export { useCourseAccent } from './presentation/use-course-accent';
