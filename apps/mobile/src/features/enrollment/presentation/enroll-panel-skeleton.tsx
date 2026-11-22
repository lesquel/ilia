import { StyleSheet } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * The enrollment box while the session and the course progress load: a hint
 * and a full-width button, so the progress card keeps its height when the
 * real panel lands.
 */
export function EnrollPanelSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton
      label="Cargando tu inscripción"
      style={styles.panel}
    >
      <BoneLines lines={2} height={14} gap={6} lastWidth="80%" />
      <Bone height={48} radius={theme.radius.md} />
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  // Same frame as the panel in `enroll-panel.tsx`.
  panel: {
    gap: 10.2,
  },
});
