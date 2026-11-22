import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';

const TILE_COUNT = 5;
const BAR_ROWS = 5;
const DAY_COLUMNS = 8;
const ROSTER_ROWS = 4;
const COLUMN_PLOT_HEIGHT = 96;

/** One tile of the figures row, on the same flex basis the real tiles use. */
function TileBone() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Bone width="55%" height={13} />
      <Bone width={56} height={30} />
      <Bone width="70%" height={12} />
    </View>
  );
}

/** A card's title and hint, as the instructor `Card` draws them. */
function CardHeadBone({ hint = true }: { hint?: boolean }) {
  return (
    <View style={styles.cardHead}>
      <Bone width="40%" height={18} />
      {hint ? <Bone width="80%" height={13} /> : null}
    </View>
  );
}

/**
 * The course figures before they arrive: the five tiles, the lesson-progress
 * bars and the enrollments-by-day columns, with the same wide/narrow switch
 * the bar rows use.
 */
export function RosterInsightsSkeleton() {
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  return (
    <Skeleton label="Cargando las cifras del curso" style={styles.group}>
      <View style={styles.tiles}>
        {Array.from({ length: TILE_COUNT }, (_, index) => (
          <TileBone key={index} />
        ))}
      </View>

      <BoneCard style={styles.card}>
        <CardHeadBone />
        <View style={styles.barList}>
          {Array.from({ length: BAR_ROWS }, (_, index) => (
            <View key={index} style={[styles.barRow, isWide ? styles.barRowWide : undefined]}>
              <View style={[styles.barTitle, isWide ? styles.barTitleWide : undefined]}>
                <Bone width={18} height={12} />
                <Bone width={index % 2 === 0 ? '70%' : '55%'} height={14} />
              </View>
              <View style={styles.barMeasure}>
                <View style={styles.track}>
                  <Bone height={12} radius={4} />
                </View>
                <Bone width={60} height={13} />
              </View>
            </View>
          ))}
        </View>
      </BoneCard>

      <BoneCard style={styles.card}>
        <CardHeadBone hint={false} />
        <View style={styles.columns}>
          {Array.from({ length: DAY_COLUMNS }, (_, index) => (
            <View key={index} style={styles.column}>
              <Bone width={14} height={12} />
              <View style={styles.columnPlot}>
                <Bone height={24 + ((index * 23) % 64)} radius={4} />
              </View>
              <Bone width="80%" height={11} />
            </View>
          ))}
        </View>
      </BoneCard>
    </Skeleton>
  );
}

/**
 * The enrolled list before it arrives, inside its card: name, email, cohort
 * tag and dates on the left, the progress bar on the right when wide and under
 * them when narrow, as each roster row lays out.
 */
export function RosterEntriesSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  return (
    <Skeleton label="Cargando inscritos" style={styles.rows}>
      {Array.from({ length: ROSTER_ROWS }, (_, index) => (
        <View
          key={index}
          style={[
            styles.rosterRow,
            isWide ? styles.rosterRowWide : undefined,
            { borderTopColor: index === 0 ? 'transparent' : theme.colors.divider },
          ]}
        >
          <View style={styles.rosterWho}>
            <Bone width="45%" height={16} />
            <Bone width="60%" height={13} />
            <View style={styles.rosterTags}>
              <Bone width={120} height={22} />
              <Bone width={180} height={12} />
            </View>
          </View>
          <View style={[styles.rosterProgress, isWide ? styles.rosterProgressWide : undefined]}>
            <Bone width="60%" height={12} />
            <Bone height={8} radius={4} />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  group: { gap: 20.4 },
  rows: { gap: 0 },
  card: { padding: 20.4, gap: 13.6 },
  cardHead: { gap: 6 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
  tile: { flexGrow: 1, flexBasis: 150, borderWidth: 1, padding: 13.6, gap: 6 },

  barList: { gap: 10.2 },
  barRow: { gap: 6 },
  barRowWide: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  barTitle: { flexDirection: 'row', alignItems: 'center', gap: 6.8, minWidth: 0 },
  barTitleWide: { width: '38%' },
  barMeasure: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10.2, minWidth: 0 },
  track: { flex: 1 },

  columns: { flexDirection: 'row', alignItems: 'flex-end', gap: 6.8 },
  column: { flex: 1, maxWidth: 56, minWidth: 0, alignItems: 'center', gap: 3.4 },
  columnPlot: { alignSelf: 'stretch', height: COLUMN_PLOT_HEIGHT, justifyContent: 'flex-end' },

  rosterRow: { gap: 10.2, paddingVertical: 13.6, borderTopWidth: 1 },
  rosterRowWide: { flexDirection: 'row', alignItems: 'center', gap: 20.4 },
  rosterWho: { flex: 1, minWidth: 0, gap: 6 },
  rosterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6.8,
    marginTop: 3.4,
  },
  rosterProgress: { alignSelf: 'stretch', gap: 6 },
  rosterProgressWide: { width: 260, alignSelf: 'center' },
});
