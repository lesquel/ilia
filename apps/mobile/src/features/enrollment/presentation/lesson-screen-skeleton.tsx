import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { lessonColumn } from '@/features/enrollment/presentation/lesson-layout';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * A lesson before it arrives: the chrome row (back link, title, step), the
 * chapter progress, then the studio deck most lessons open in, with its scene
 * strip, a slide of copy and the control dock pinned at the bottom.
 */
export function LessonScreenSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  return (
    <Skeleton label="Cargando la lección" style={styles.group}>
      <View style={[styles.chrome, lessonColumn]}>
        <Bone height={14} width={56} />
        <View style={styles.chromeTitle}>
          <Bone height={15} width="60%" />
        </View>
        <Bone height={13} width={36} />
      </View>

      <View style={[styles.moduleProgress, lessonColumn]}>
        <View style={styles.moduleProgressCopy}>
          <Bone height={12} width="40%" />
          <Bone height={12} width={40} />
        </View>
        <Bone height={4} radius={99} />
      </View>

      <View style={styles.deck}>
        <View style={[styles.film, lessonColumn]}>
          {FILM_BEATS.map((beatWidth, index) => (
            <Bone key={index} height={4} width={beatWidth} radius={99} />
          ))}
          <Bone height={13} width={96} style={styles.filmLabel} />
        </View>

        <View style={[styles.slide, lessonColumn, isWide ? styles.slideWide : undefined]}>
          <Bone height={13} width={120} />
          <Bone height={28} width={isWide ? '55%' : '85%'} />
          <BoneLines lines={4} height={16} gap={10} lastWidth="65%" />
        </View>

        <View
          style={[
            styles.dock,
            { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={[styles.dockActions, isWide ? undefined : styles.dockActionsCompact]}>
            <Bone height={48} width={108} radius={theme.radius.md} />
            <View style={isWide ? styles.primaryWide : styles.primaryCompact}>
              <Bone height={48} radius={theme.radius.md} />
            </View>
          </View>
        </View>
      </View>
    </Skeleton>
  );
}

/** The scene strip: the current beat is long, the rest short. */
const FILM_BEATS = [36, 18, 18, 18, 18];

const styles = StyleSheet.create({
  group: { flex: 1, gap: 0 },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chromeTitle: { flex: 1 },
  moduleProgress: { paddingHorizontal: 24, paddingBottom: 8, gap: 5 },
  moduleProgressCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deck: { flex: 1, minHeight: 0 },
  film: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filmLabel: { marginLeft: 8 },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 88,
    gap: 14,
  },
  // The presenter's corner stays clear, as in the deck.
  slideWide: { paddingRight: 28 + 176, paddingBottom: 24 },
  dock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dockActionsCompact: { width: '100%' },
  primaryWide: { width: 200 },
  primaryCompact: { flexGrow: 1, flexShrink: 1 },
});
