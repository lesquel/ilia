import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * The result before the submission loads: eyebrow and verdict, the prompt and
 * the sheet as two stations (side by side when wide), then the per-dimension
 * rows and the feedback. Only for the first load; grading keeps its own
 * "Evaluando tu prompt…" message.
 */
export function ResultScreenSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  const frame = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg,
  };
  const panel = { borderColor: theme.colors.divider, borderRadius: theme.radius.md };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Skeleton
        label="Buscando tu entrega"
        style={[styles.content, isWide ? styles.contentWide : undefined]}
      >
        <Bone width={140} height={11} />
        <Bone width={220} height={20} style={styles.verdict} />

        <View style={[styles.pair, isWide ? styles.pairWide : undefined]}>
          <View style={[styles.station, isWide ? styles.stationWide : undefined]}>
            <Bone width={70} height={13} />
            <View style={[styles.stationCard, frame]}>
              <BoneLines lines={4} height={13} />
            </View>
            <View style={styles.sideScore}>
              <Bone width={110} height={13} />
              <Bone width={40} height={28} />
            </View>
          </View>

          <Bone width={28} height={28} radius={theme.radius.sm} style={styles.arrow} />

          <View style={[styles.station, isWide ? styles.stationWide : undefined]}>
            <Bone width={60} height={13} />
            <View style={[styles.stationCard, frame]}>
              <BoneLines lines={4} height={13} />
            </View>
            <View style={styles.sideScore}>
              <Bone width={110} height={13} />
              <Bone width={40} height={28} />
            </View>
          </View>
        </View>

        <Bone width={150} height={18} style={styles.sectionTitle} />
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={[styles.dimension, panel]}>
            <View style={styles.dimensionHeader}>
              <Bone width="45%" height={15} />
              <Bone width={32} height={20} />
            </View>
            <Bone height={8} radius={theme.radius.sm} />
            <BoneLines lines={2} height={12} lastWidth="70%" />
          </View>
        ))}

        <Bone width={120} height={18} style={styles.sectionTitle} />
        <BoneLines lines={3} height={14} />
      </Skeleton>
    </View>
  );
}

// Mirrors the frame and stations in result-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20.4,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  contentWide: { maxWidth: 1080 },
  verdict: { marginBottom: 6.8 },
  pair: { gap: 12, marginVertical: 8 },
  pairWide: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  station: { gap: 8 },
  stationWide: { flex: 1, minWidth: 0 },
  stationCard: { borderWidth: 1, padding: 16 },
  arrow: { alignSelf: 'center' },
  sideScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { marginTop: 13.6 },
  dimension: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  dimensionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
