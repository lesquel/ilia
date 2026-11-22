import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';
import { useIsWide } from '@/core/ui/surface';

const ROWS = 4;

/**
 * The submission history before it loads: one card of rows, each with the
 * activity title, two facts and the prompt, and the attempt and tag at the end
 * (beside it when wide). Rendered inside the screen's own frame; `withHeader`
 * also draws the header for the session check, before the real one exists.
 */
export function EvaluationsScreenSkeleton({
  label,
  withHeader = false,
}: {
  label: string;
  withHeader?: boolean;
}) {
  const theme = useTheme();
  const isWide = useIsWide();

  return (
    <Skeleton label={label} style={styles.group}>
      {withHeader ? (
        <View style={styles.header}>
          <Bone width={100} height={14} />
          <View style={[styles.headerRow, isWide ? styles.headerRowWide : undefined]}>
            <View style={styles.headerCopy}>
              <Bone width="60%" height={30} radius={theme.radius.md} />
              <Bone width="80%" height={15} />
            </View>
            <Bone width={140} height={40} radius={theme.radius.md} />
          </View>
        </View>
      ) : null}

      <BoneCard style={styles.list}>
        {Array.from({ length: ROWS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.row,
              isWide ? styles.rowWide : undefined,
              index === 0 ? undefined : { borderTopWidth: 1, borderTopColor: theme.colors.divider },
            ]}
          >
            <View style={styles.what}>
              <Bone width="55%" height={16} />
              <View style={styles.facts}>
                <Bone width={120} height={12} />
                <Bone width={130} height={12} />
              </View>
              <Bone width="85%" height={13} />
            </View>
            <View style={[styles.result, isWide ? styles.resultWide : undefined]}>
              <Bone width={64} height={13} />
              <Bone width={56} height={22} radius={theme.radius.sm} />
            </View>
          </View>
        ))}
      </BoneCard>
    </Skeleton>
  );
}

// Mirrors the header and rows in evaluations-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  group: { gap: 20.4 },
  header: { gap: 6.8 },
  headerRow: { gap: 13.6 },
  headerRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 6.8 },
  list: { gap: 0, paddingVertical: 6.8, paddingHorizontal: 20.4 },
  row: { gap: 10.2, paddingVertical: 13.6 },
  rowWide: { flexDirection: 'row', alignItems: 'center', gap: 20.4 },
  what: { flex: 1, minWidth: 0, gap: 6.8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
  result: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  resultWide: { justifyContent: 'flex-end' },
});
