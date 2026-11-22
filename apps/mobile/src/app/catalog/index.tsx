import { useMemo } from 'react';

import { useSession } from '@/features/auth';
import { catalogProgressBySlug } from '@/features/catalog/domain/catalog-progress';
import { CatalogScreen } from '@/features/catalog/presentation/catalog-screen';
import { useMyCourses } from '@/features/enrollment/application/use-enrollment';

/**
 * Composition of two features: the catalog does not import enrollment, so the
 * route reads the enrolments and hands their progress to the catalog screen.
 */
export default function CatalogRoute() {
  const { isAuthenticated } = useSession();

  // A visitor has no enrolments; asking would only answer 401.
  return isAuthenticated ? <CatalogWithProgress /> : <CatalogScreen />;
}

function CatalogWithProgress() {
  const { courses: enrolments } = useMyCourses();
  const progressBySlug = useMemo(() => catalogProgressBySlug(enrolments), [enrolments]);

  return <CatalogScreen progressBySlug={progressBySlug} enrolments={enrolments} />;
}
