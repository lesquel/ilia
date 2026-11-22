import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import {
  LESSON_LIA_PANEL_WIDTH,
  lessonColumn,
  lessonWideColumn,
} from '@/features/enrollment/presentation/lesson-layout';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * A lesson before it arrives: the top bar (back button, course and title, the
 * lesson segments), then the studio deck most lessons open in. On a wide
 * screen the deck is the scene on the left and Lía's panel on the right; on a
 * phone it is one column with the control dock pinned at the bottom.
 */
export function LessonScreenSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const column = isWide ? lessonWideColumn : lessonColumn;

  const segments = (
    <View style={[styles.segments, isWide ? styles.segmentsWide : undefined]}>
      {SEGMENTS.map((key) => (
        <View key={key} style={styles.segment}>
          <Bone height={5} radius={999} />
        </View>
      ))}
    </View>
  );

  const film = (
    <View style={[styles.film, isWide ? undefined : styles.filmCompact]}>
      {FILM_BEATS.map((beatWidth, index) => (
        <Bone key={index} height={4} width={beatWidth} radius={99} />
      ))}
      <Bone height={13} width={96} style={styles.filmLabel} />
    </View>
  );

  const slide = (
    <View style={[styles.slide, isWide ? undefined : styles.slideCompact]}>
      <Bone height={13} width={120} />
      <Bone height={28} width={isWide ? '70%' : '85%'} />
      <BoneLines lines={4} height={16} gap={10} lastWidth="65%" />
    </View>
  );

  return (
    <Skeleton label="Cargando la lección" style={styles.group}>
      <View
        style={[
          styles.bar,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider },
        ]}
      >
        <View style={[styles.barInner, column]}>
          <View style={styles.barRow}>
            <Bone height={40} width={40} radius={12} />
            <View style={styles.barCopy}>
              <Bone height={12} width={isWide ? 220 : 120} />
              <Bone height={16} width={isWide ? 280 : '80%'} />
            </View>
            {isWide ? segments : null}
          </View>
          {isWide ? null : segments}
        </View>
      </View>

      <View style={styles.deck}>
        {isWide ? (
          <View style={[styles.stage, column]}>
            <View style={styles.stageMain}>
              {film}
              {slide}
            </View>
            <View
              style={[
                styles.panel,
                {
                  borderColor: theme.colors.divider,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.lg + 4,
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <Bone height={44} width={44} radius={22} />
                <View style={styles.barCopy}>
                  <Bone height={14} width={48} />
                  <Bone height={12} width={160} />
                </View>
              </View>
              <Bone height={64} width="85%" radius={16} />
              <Bone height={44} width="70%" radius={16} />
            </View>
          </View>
        ) : (
          <View style={[styles.compactDeck, lessonColumn]}>
            {film}
            {slide}
          </View>
        )}

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

const SEGMENTS = ['s1', 's2', 's3', 's4', 's5', 's6'];

/** The scene strip: the current beat is long, the rest short. */
const FILM_BEATS = [36, 18, 18, 18, 18];

const styles = StyleSheet.create({
  group: { flex: 1, gap: 0 },
  bar: { borderBottomWidth: 1 },
  barInner: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  barCopy: { flexShrink: 1, minWidth: 0, gap: 6 },
  segments: { flexDirection: 'row', gap: 4 },
  segmentsWide: { flex: 1, gap: 6, marginHorizontal: 16 },
  segment: { flex: 1 },
  deck: { flex: 1, minHeight: 0 },
  stage: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  stageMain: { flex: 1, minWidth: 0, gap: 12 },
  compactDeck: { flex: 1, minHeight: 0 },
  panel: { width: LESSON_LIA_PANEL_WIDTH, borderWidth: 1, padding: 20, gap: 14 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  film: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filmCompact: { paddingHorizontal: 24 },
  filmLabel: { marginLeft: 8 },
  slide: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  slideCompact: { paddingHorizontal: 24, paddingBottom: 88 },
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
