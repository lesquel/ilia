import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';
import { useIsWide } from '@/core/ui/surface';

const CONTENT_MAX_WIDTH = 960;
const CONTENT_PADDING = 20.4;
const GRID_GAP = 13.6;
const CARDS = 2;

/**
 * The certificates before they load: certificate cards (two across when wide)
 * with the tag, course title, facts, the framed code and the actions. Rendered
 * inside the screen's own frame; `withHeader` also draws the header for the
 * session check, before the real one exists.
 */
export function MyCertificatesScreenSkeleton({
  label,
  withHeader = false,
}: {
  label: string;
  withHeader?: boolean;
}) {
  const theme = useTheme();
  const isWide = useIsWide();
  const { width } = useWindowDimensions();

  // The same grid arithmetic as my-certificates-screen.tsx.
  const columns = width >= breakpoint.compact ? 2 : 1;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - CONTENT_PADDING * 2;
  const cardWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  return (
    <Skeleton label={label} style={styles.group}>
      {withHeader ? (
        <View style={[styles.headerRow, isWide ? styles.headerRowWide : undefined]}>
          <View style={styles.headerCopy}>
            <Bone width="45%" height={30} radius={theme.radius.md} />
            <Bone width="85%" height={15} />
          </View>
          <Bone width={200} height={40} radius={theme.radius.md} />
        </View>
      ) : null}

      <View style={columns > 1 ? styles.grid : styles.stack}>
        {Array.from({ length: CARDS }, (_, index) => (
          <View key={index} style={columns > 1 ? { width: cardWidth } : undefined}>
            <BoneCard style={styles.card}>
              <Bone width={64} height={22} radius={theme.radius.sm} />
              <View style={styles.head}>
                <Bone width="75%" height={20} />
                <View style={styles.facts}>
                  <Bone width={110} height={12} />
                  <Bone width={140} height={12} />
                </View>
              </View>
              <View
                style={[
                  styles.code,
                  {
                    backgroundColor: theme.colors.neutral[100],
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Bone width={150} height={12} />
                <Bone width="60%" height={24} />
              </View>
              <View style={styles.actions}>
                <Bone width={220} height={40} radius={theme.radius.md} />
                <Bone width={120} height={40} radius={theme.radius.md} />
              </View>
            </BoneCard>
          </View>
        ))}
      </View>
    </Skeleton>
  );
}

// Mirrors the header, grid and card in my-certificates-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  group: { gap: 20.4 },
  headerRow: { gap: 13.6 },
  headerRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 6.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: GRID_GAP },
  stack: { gap: GRID_GAP },
  // The real Card's padding and gap.
  card: { flexGrow: 1, padding: 20.4, gap: 13.6 },
  head: { gap: 6.8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
  code: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
});
