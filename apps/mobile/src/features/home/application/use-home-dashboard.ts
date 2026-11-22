import { useCourse } from '@/features/catalog';
import { useMyCertificates } from '@/features/certificates';
import { useMyCourses } from '@/features/enrollment';
import { useGlobalSubmissionHistory, useSubmissionResult } from '@/features/lab';

import {
  courseToContinue,
  heroFor,
  labDeltaLine,
  latestGradedAttempt,
  nearestCertificate,
  type HeroView,
  type NearestCertificateView,
} from '@/features/home/domain/dashboard';

export interface LastLabView {
  activityTitle: string;
  score: number;
  passed: boolean;
  deltaLine: string | null;
  href: string;
}

/**
 * Everything the student's home shows, from endpoints that already exist.
 *
 * Only `myCourses` gates the screen. The side blocks load on their own and
 * stay out of the page while they have nothing real to say.
 */
export function useHomeDashboard() {
  const { courses, isLoading, error, refetch } = useMyCourses();
  const continuing = courseToContinue(courses);
  const { course: detail } = useCourse(continuing?.course.slug ?? '');
  const hero: HeroView | undefined = continuing
    ? heroFor(continuing, detail?.modules ?? null)
    : undefined;

  const { certificates, isLoading: isLoadingCertificates } = useMyCertificates();
  const certificate: NearestCertificateView | undefined = isLoadingCertificates
    ? undefined
    : nearestCertificate(courses, certificates);

  const { items } = useGlobalSubmissionHistory(courses.length > 0);
  const graded = latestGradedAttempt(items);
  const current = useSubmissionResult(graded?.current.submission.id ?? '');
  const previous = useSubmissionResult(graded?.previous?.submission.id ?? '');

  const lastLab: LastLabView | undefined =
    graded && current.evaluation
      ? {
          activityTitle: graded.current.activityTitle,
          score: Math.round(current.evaluation.effectiveTotal),
          passed: current.evaluation.passed,
          deltaLine: labDeltaLine(
            current.evaluation.effectiveTotal,
            previous.evaluation?.effectiveTotal ?? null,
            graded.previous?.submission.attempt ?? null,
          ),
          href: `/lab/submissions/${graded.current.submission.id}`,
        }
      : undefined;

  return {
    courses,
    continuing,
    hero,
    certificate,
    lastLab,
    isLoading,
    error,
    refetch,
  };
}
