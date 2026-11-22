import { StyleSheet, View } from 'react-native';

import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';

/** The home's shape before the data lands: greeting, hero, courses, side column. */
export function HomeScreenSkeleton({ twoColumns, compact }: { twoColumns: boolean; compact: boolean }) {
  return (
    <Skeleton label="Cargando tu inicio">
      <View style={twoColumns ? styles.columns : styles.stack}>
        <View style={styles.main}>
          <View style={styles.greeting}>
            <Bone width={160} height={12} />
            <Bone width={compact ? '85%' : '60%'} height={compact ? 30 : 40} />
          </View>
          <Bone height={compact ? 220 : 300} radius={compact ? 24 : 28} />
          {compact ? (
            <View style={styles.tiles}>
              <Bone height={110} radius={20} style={styles.tile} />
              <Bone height={110} radius={20} style={styles.tile} />
            </View>
          ) : null}
          <Bone width={140} height={20} />
          <View style={compact ? styles.stack : styles.grid}>
            {[0, 1, 2].map((index) => (
              <BoneCard key={index} style={compact ? undefined : styles.gridCard}>
                <View style={styles.cardHead}>
                  <Bone height={44} width={44} radius={12} />
                  <View style={styles.cardText}>
                    <BoneLines lines={2} lastWidth="55%" />
                  </View>
                </View>
                <Bone height={6} radius={999} />
              </BoneCard>
            ))}
          </View>
        </View>

        {compact ? null : (
          <View style={twoColumns ? styles.aside : styles.stack}>
            <BoneCard>
              <View style={styles.cardHead}>
                <Bone circle height={76} />
                <View style={styles.cardText}>
                  <BoneLines lines={3} lastWidth="40%" />
                </View>
              </View>
            </BoneCard>
            <BoneCard>
              <BoneLines lines={3} lastWidth="70%" />
            </BoneCard>
            <Bone height={120} radius={20} />
          </View>
        )}
      </View>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },
  stack: { gap: 16 },
  main: { flex: 1, minWidth: 0, gap: 20 },
  aside: { width: 360, gap: 16 },
  greeting: { gap: 10 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridCard: { flexGrow: 1, flexBasis: 220 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardText: { flex: 1 },
});
