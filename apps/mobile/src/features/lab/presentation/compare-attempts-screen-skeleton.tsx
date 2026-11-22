import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';
import { useIsWide } from '@/core/ui/surface';

/**
 * Comparing attempts before they load: eyebrow and title, the two chip rows,
 * the two attempt columns (side by side when wide) and the "Qué cambió" card.
 */
export function CompareAttemptsScreenSkeleton() {
  const theme = useTheme();
  const isWide = useIsWide();

  const card = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Skeleton
        label="Buscando tus intentos"
        style={[styles.content, isWide ? styles.contentWide : undefined]}
      >
        <Bone width={200} height={12} />
        <Bone width="70%" height={22} />

        {[0, 1].map((row) => (
          <View key={row} style={styles.chipRow}>
            <Bone width={64} height={13} />
            <Bone width={84} height={30} radius={theme.radius.sm} />
            <Bone width={84} height={30} radius={theme.radius.sm} />
          </View>
        ))}

        <View style={[styles.pair, isWide ? styles.pairWide : undefined]}>
          {[0, 1].map((column) => (
            <View key={column} style={[styles.column, isWide ? styles.columnWide : undefined]}>
              <Bone width={90} height={15} />
              <View style={[styles.card, card]}>
                <BoneLines lines={4} height={13} />
              </View>
              <Bone width={80} height={14} />
            </View>
          ))}
        </View>

        <View style={[styles.card, card, styles.summary]}>
          <Bone width={100} height={15} />
          {Array.from({ length: 4 }, (_, index) => (
            <View key={index} style={styles.dimRow}>
              <Bone width="45%" height={14} />
              <Bone width={36} height={14} />
            </View>
          ))}
        </View>
      </Skeleton>
    </View>
  );
}

// Mirrors the frame and columns in compare-attempts-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14 },
  contentWide: { maxWidth: 1040, width: '100%', alignSelf: 'center', padding: 32 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pair: { gap: 16 },
  pairWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { gap: 8 },
  columnWide: { flex: 1 },
  card: { borderWidth: 1, padding: 14 },
  summary: { gap: 6 },
  dimRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
