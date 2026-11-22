import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneLines } from '@/core/ui/skeleton';

/**
 * The bones of one `CourseCard`: the cover at its fixed height, then the body
 * in the same order (title, two-line summary, footer rule with meta and call
 * to action), so a grid of these lines up with the grid of cards that replaces
 * it. The progress bar of an enrolled course is not drawn: which cards have
 * one is not known yet. Use inside a `Skeleton`.
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
          <Bone height={19} width="88%" />
          <Bone height={19} width="56%" />
        </View>

        <View style={styles.summary}>
          <BoneLines lines={2} height={12} gap={7} lastWidth="70%" />
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
          <Bone height={12} width="46%" />
          <Bone height={14} width={84} />
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
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 8,
  },
  title: {
    gap: 6,
  },
  summary: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
