import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';
import { MAX_COLUMNS, TILE_GAP, TILE_MIN_WIDTH } from '@/features/admin/presentation/overview-panel';

/** Tab label widths, close to the six real labels so the strip keeps its length. */
const TAB_WIDTHS = [72, 128, 76, 96, 84, 80];
/** The overview's three groups: people, courses, certification. */
const GROUP_TILES = [3, 4, 2];
const FUNNEL_STEPS = 3;

/**
 * A group heading and its tiles, on the same measured grid the overview uses,
 * so the tiles land on the columns the real ones will take.
 */
function TileGroupBone({ tiles }: { tiles: number }) {
  const theme = useTheme();
  const [rowWidth, setRowWidth] = useState(0);

  const columns = Math.max(
    2,
    Math.min(MAX_COLUMNS, Math.floor((rowWidth + TILE_GAP) / (TILE_MIN_WIDTH + TILE_GAP))),
  );
  const tileWidth =
    rowWidth > 0 ? Math.floor((rowWidth - TILE_GAP * (columns - 1)) / columns) : undefined;

  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Bone width={96} height={13} />
        <Bone width={140} height={13} />
      </View>
      <View style={styles.tiles} onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
        {Array.from({ length: tiles }, (_, index) => (
          <View
            key={index}
            style={[
              styles.tile,
              tileWidth === undefined ? styles.tileUnmeasured : { width: tileWidth },
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Bone width={36} height={36} style={styles.tileIcon} />
            <Bone width={48} height={30} />
            <Bone width="70%" height={13} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The admin dashboard before the overview arrives: the title, the tab strip
 * and the overview tab (three tile groups and the funnel card), in the same
 * column the dashboard uses.
 */
export function AdminScreenSkeleton() {
  const theme = useTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <Skeleton label="Cargando el panel" style={styles.screen}>
        <Bone width={230} height={32} />

        <View style={styles.tabs}>
          {TAB_WIDTHS.map((width, index) => (
            <Bone
              key={index}
              width={width + 50}
              height={44}
              radius={theme.radius.md}
            />
          ))}
        </View>

        <View style={styles.panel}>
          {GROUP_TILES.map((tiles, index) => (
            <TileGroupBone key={index} tiles={tiles} />
          ))}

          <BoneCard style={styles.card}>
            <View style={styles.cardHead}>
              <Bone width="45%" height={18} />
              <Bone width="85%" height={13} />
            </View>
            <View style={styles.barList}>
              {Array.from({ length: FUNNEL_STEPS }, (_, index) => (
                <View key={index} style={styles.barRow}>
                  <Bone width={104} height={13} />
                  <View style={styles.track}>
                    <Bone height={12} radius={4} />
                  </View>
                  <Bone width={36} height={14} />
                </View>
              ))}
            </View>
          </BoneCard>
        </View>
      </Skeleton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  screen: { gap: 20.4 },
  // Clipped rather than scrolled: a skeleton strip has nothing to scroll to.
  tabs: { flexDirection: 'row', gap: 6.8, paddingBottom: 3.4, overflow: 'hidden' },
  panel: { gap: 20.4 },
  group: { gap: 10.2 },
  groupHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10.2, rowGap: 3.4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: { borderWidth: 1, padding: 13.6, gap: 6 },
  tileUnmeasured: { flexBasis: TILE_MIN_WIDTH, flexGrow: 0 },
  tileIcon: { marginBottom: 3.4 },
  card: { padding: 20.4, gap: 13.6 },
  cardHead: { gap: 6 },
  barList: { gap: 10.2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  track: { flex: 1 },
});
