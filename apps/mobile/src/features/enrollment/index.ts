/** Public entry point of the enrollment feature. */

export { callToAction, hasStarted, isLessonCompleted } from './domain/entities';
export { primaryCourseToContinue, resumeTargetForCourse } from './domain/resume';
export type { ResumeTarget } from './domain/resume';
export type {
  CourseProgress,
  EnrolledCourse,
  Enrollment,
  LessonView,
  NextLesson,
} from './domain/entities';
export {
  enrollmentKeys,
  useCompleteLesson,
  useLesson,
  useCourseProgress,
  useEnroll,
  useMyCourses,
} from './application/use-enrollment';
