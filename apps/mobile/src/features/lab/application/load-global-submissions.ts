import type { CatalogRepository } from '@/features/catalog/domain/repository';
import type { EnrolledCourse } from '@/features/enrollment/domain/entities';
import type { EnrollmentRepository } from '@/features/enrollment/data/enrollment-repository'; // orchestration across enrolled courses
import {
  sortSubmissionHistory,
  type SubmissionHistoryItem,
} from '@/features/lab/domain/submission-history';
import type { LabRepository } from '@/features/lab/data/lab-repository';

/**
 * Loads every submission the student has across enrolled courses.
 *
 * The API only exposes `GET /lab/activities/{id}/submissions`, so this walks
 * syllabus activities from the catalog and merges the responses.
 */
export async function loadGlobalSubmissionHistory(
  enrollmentRepo: EnrollmentRepository,
  catalogRepo: CatalogRepository,
  labRepo: LabRepository,
): Promise<SubmissionHistoryItem[]> {
  const enrolled: EnrolledCourse[] = await enrollmentRepo.myCourses();
  const items: SubmissionHistoryItem[] = [];

  for (const row of enrolled) {
    const course = await catalogRepo.getBySlug(row.course.slug);
    for (const module of course.modules) {
      for (const activity of module.activities) {
        const submissions = await labRepo.mySubmissions(activity.id);
        for (const submission of submissions) {
          items.push({
            submission,
            activityId: activity.id,
            activityTitle: activity.title,
            courseSlug: course.slug,
            courseTitle: course.title,
          });
        }
      }
    }
  }

  return sortSubmissionHistory(items);
}
