import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useCourse } from '@/features/catalog';
import { courseSlugInPath, documentTitle } from '@/features/auth/domain/app-location';

/**
 * Names the browser tab after the page. Without it every tab reads the bare
 * URL, and a teacher with the course and two lessons open cannot tell them apart.
 */
export function DocumentTitle() {
  const pathname = usePathname();
  const courseTitle = useCourse(courseSlugInPath(pathname) ?? '').course?.title;
  const title = documentTitle(pathname, { courseTitle });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = title;
  }, [title]);

  return null;
}
