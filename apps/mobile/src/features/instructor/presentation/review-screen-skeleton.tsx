import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

const INBOX_ROWS = 4;

/**
 * The review desk before it arrives: the three columns (the submission, Lía's
 * proposal, the correction form) side by side on a wide screen and stacked on
 * a phone, then the list of every submission. It sits under the header the
 * screen already shows.
 */
export function ReviewScreenSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= breakpoint.medium;
  const frame = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg,
  };

  return (
    <Skeleton label="Cargando entregas" style={styles.screen}>
      <View style={[styles.workbench, wide ? styles.workbenchWide : undefined]}>
        <View style={[styles.column, wide ? styles.columnWide : undefined, frame]}>
          <Bone height={18} width="70%" />
          <Bone height={13} width="55%" />
          <BoneLines lines={4} height={13} lastWidth="65%" />
        </View>
        <View style={[styles.column, wide ? styles.columnWide : undefined, frame]}>
          <Bone height={18} width="60%" />
          <Bone height={22} width={84} />
          <Bone height={56} width={90} />
          <Bone height={10} />
          <Bone height={13} width="80%" />
        </View>
        <View style={[styles.column, wide ? styles.columnWide : undefined, frame]}>
          <Bone height={18} width="50%" />
          <Bone height={44} />
          <Bone height={90} />
          <View style={styles.chips}>
            <Bone height={28} width={110} radius={14} />
            <Bone height={28} width={120} radius={14} />
            <Bone height={28} width={140} radius={14} />
          </View>
          <Bone height={44} />
        </View>
      </View>

      <View style={[styles.inbox, frame]}>
        <Bone height={18} width={180} />
        {Array.from({ length: INBOX_ROWS }, (_, index) => (
          <View key={index} style={styles.inboxRow}>
            <View style={styles.inboxText}>
              <Bone height={15} width="40%" />
              <Bone height={13} width="60%" />
            </View>
            <Bone height={15} width={28} />
          </View>
        ))}
      </View>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  workbench: { gap: 16 },
  workbenchWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { borderWidth: 1, padding: 20.4, gap: 10.2 },
  columnWide: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  inbox: { borderWidth: 1, padding: 20.4, gap: 13.6 },
  inboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  inboxText: { flex: 1, gap: 6 },
});
