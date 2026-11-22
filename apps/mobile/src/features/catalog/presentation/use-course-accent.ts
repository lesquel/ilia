import { useTheme } from '@/core/theme';

import { courseAccent, type CourseAccent } from './course-tone';

/** `courseAccent` with the app's accent as the fallback. */
export function useCourseAccent(slug: string | undefined): CourseAccent {
  const theme = useTheme();
  return courseAccent(slug, {
    ink: theme.colors.accentButton,
    wash: theme.colors.accentRamp[100],
    mid: theme.colors.accentRamp[300],
  });
}
