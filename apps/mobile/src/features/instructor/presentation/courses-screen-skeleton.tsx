import { StyleSheet, View } from 'react-native';

import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';

const KPI_COUNT = 4;
const QUEUE_ROWS = 4;
const COURSE_TILES = 3;
const COLUMN_HEIGHTS = [150, 138, 132, 120, 81, 75, 70, 62];

/**
 * The instructor dashboard before it arrives: the four figures, the drop-off
 * chart beside the review queue, and the course tiles, on the same grid the
 * loaded screen draws. It sits under the greeting the screen already shows.
 */
export function CoursesScreenSkeleton() {
  return (
    <Skeleton label="Cargando tu panel" style={styles.screen}>
      <View style={styles.kpis}>
        {Array.from({ length: KPI_COUNT }, (_, index) => (
          <BoneCard key={index} style={styles.kpi}>
            <Bone width="60%" height={13} />
            <Bone width={64} height={32} />
            <Bone width="75%" height={12} />
          </BoneCard>
        ))}
      </View>

      <View style={styles.panels}>
        <BoneCard style={[styles.panel, styles.main]}>
          <Bone width="55%" height={19} />
          <View style={styles.columns}>
            {COLUMN_HEIGHTS.map((height, index) => (
              <View key={index} style={styles.column}>
                <Bone width="100%" height={height} />
              </View>
            ))}
          </View>
          <BoneLines lines={2} height={13} lastWidth="60%" />
        </BoneCard>

        <BoneCard style={[styles.panel, styles.side]}>
          <Bone width="50%" height={19} />
          {Array.from({ length: QUEUE_ROWS }, (_, index) => (
            <View key={index} style={styles.queueRow}>
              <Bone height={36} circle />
              <View style={styles.queueText}>
                <Bone width="60%" height={14} />
                <Bone width="80%" height={12} />
              </View>
              <Bone width={28} height={22} />
            </View>
          ))}
        </BoneCard>
      </View>

      <Bone width={140} height={22} />
      <View style={styles.tiles}>
        {Array.from({ length: COURSE_TILES }, (_, index) => (
          <BoneCard key={index} style={styles.tile}>
            <View style={styles.tileHead}>
              <Bone width={44} height={44} />
              <Bone width={80} height={22} />
            </View>
            <Bone width="85%" height={18} />
            <Bone width="50%" height={13} />
          </BoneCard>
        ))}
      </View>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { padding: 16, gap: 8, flexGrow: 1, flexBasis: 170, minWidth: 150 },
  panels: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  panel: { padding: 20.4, gap: 13.6, minWidth: 0 },
  main: { flexGrow: 2, flexBasis: 420 },
  side: { flexGrow: 1, flexBasis: 300 },
  columns: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 150 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  queueText: { flex: 1, gap: 6 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { padding: 18, gap: 10, flexGrow: 1, flexBasis: 260 },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
