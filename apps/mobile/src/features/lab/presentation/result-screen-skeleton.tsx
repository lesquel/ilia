import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * The result before the submission loads: the hero card (score ring, tag,
 * verdict), the prompt and the sheet as two stations (side by side when
 * wide), then the dimension bars and the feedback as two cards. Only for the first load; grading keeps its own
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
  const card = { ...frame, borderRadius: theme.radius.lg + 4 };
  const ring = isWide ? 200 : 160;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Skeleton
        label="Buscando tu entrega"
        style={[styles.content, isWide ? styles.contentWide : undefined]}
      >
        <View style={[styles.hero, card, isWide ? styles.heroWide : undefined]}>
          <Bone height={ring} width={ring} circle />
          <View style={[styles.heroCopy, isWide ? styles.heroCopyWide : undefined]}>
            <Bone width={170} height={26} radius={999} />
            <Bone width={isWide ? '70%' : '85%'} height={isWide ? 36 : 26} />
            <Bone width="55%" height={15} />
          </View>
        </View>

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

        <View style={[styles.columns, isWide ? styles.columnsWide : undefined]}>
          <View style={[styles.column, styles.section, card]}>
            <Bone width={150} height={17} />
            {Array.from({ length: 3 }, (_, index) => (
              <View key={index} style={styles.dimension}>
                <View style={styles.dimensionHeader}>
                  <Bone width="45%" height={14} />
                  <Bone width={28} height={14} />
                </View>
                <Bone height={10} radius={999} />
                <BoneLines lines={1} height={12} />
              </View>
            ))}
          </View>
          <View style={[styles.column, styles.section, card]}>
            <Bone width={120} height={17} />
            <BoneLines lines={3} height={14} />
            <Bone height={46} width={200} radius={theme.radius.md} />
          </View>
        </View>
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
  contentWide: { maxWidth: 1240, padding: 32, gap: 16 },
  hero: { borderWidth: 1, padding: 20, gap: 16, alignItems: 'center' },
  heroWide: { flexDirection: 'row', padding: 28, gap: 28 },
  heroCopy: { gap: 10, alignSelf: 'stretch' },
  heroCopyWide: { flex: 1, minWidth: 0, alignSelf: 'center' },
  columns: { gap: 16, marginTop: 6.8 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  column: { flex: 1, minWidth: 0 },
  section: { borderWidth: 1, padding: 20, gap: 14 },
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
  dimension: { gap: 6 },
  dimensionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
