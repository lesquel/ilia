import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneLines } from '@/core/ui/skeleton';

/**
 * The bones of one `CourseCard`: the cover at its fixed height, then the body
 * in the same order (title, two-line summary, meta row, footer rule), so a grid of these lines up exactly with
 * the grid of cards that replaces it. Use inside a `Skeleton`.
 */
export function CourseCardSkeleton() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Bone height={COVER_HEIGHT} radius={0} />

      <View style={styles.body}>
        <View style={styles.title}>
          <Bone height={20} width="88%" />
          <Bone height={20} width="56%" />
        </View>

        <View style={styles.summary}>
          <BoneLines lines={2} height={12} gap={8} lastWidth="70%" />
        </View>

        <View style={styles.metaRow}>
          <Bone height={13} width={92} />
          <Bone height={13} width={64} />
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
          <Bone height={13} width="42%" />
          <Bone height={14} width={96} />
        </View>
      </View>
    </View>
  );
}

/** `CourseCoverArt` reserves this height for every cover. */
const COVER_HEIGHT = 268;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    padding: 20.4,
    gap: 8,
  },
  title: {
    gap: 6,
  },
  summary: {
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
