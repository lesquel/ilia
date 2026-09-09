/** Public entry point of the instructor feature. */

export { STATUS_LABELS, canPublish, slugify } from './domain/entities';
export type {
  AuthoredCourse,
  CourseStatus,
  ReviewItem,
  RosterEntry,
} from './domain/entities';
export {
  instructorKeys,
  useAddLesson,
  useAddModule,
  useAuthoredCourses,
  useCreateCourse,
  useOverrideScore,
  usePublishCourse,
  useReviewInbox,
  useRoster,
  useUnpublishCourse,
  useUpdateCourse,
} from './application/use-instructor';
export { CourseDetailsForm } from './presentation/course-details-form';
