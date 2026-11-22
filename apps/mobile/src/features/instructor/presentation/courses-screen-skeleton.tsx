import { StyleSheet, View } from 'react-native';

import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';

const PLACEHOLDER_ROWS = 3;

/**
 * The instructor's course rows before they arrive: a status tag, a two-line
 * title and the four facts, in the same card the list draws. It sits where the
 * list's rows go, under the header the screen already shows.
 */
export function CoursesScreenSkeleton() {
  return (
    <Skeleton label="Cargando tus cursos" style={styles.list}>
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <BoneCard key={index} style={styles.card}>
          <Bone width={92} height={24} />
          <View style={styles.title}>
            <Bone height={20} width="85%" />
            <Bone height={20} width="50%" />
          </View>
          <View style={styles.facts}>
            <Bone width={84} height={13} />
            <Bone width={78} height={13} />
            <Bone width={86} height={13} />
            <Bone width={60} height={13} />
          </View>
        </BoneCard>
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  list: { gap: 13.6 },
  card: { padding: 20.4, gap: 10.2 },
  title: { gap: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 13.6, rowGap: 6.8 },
});
