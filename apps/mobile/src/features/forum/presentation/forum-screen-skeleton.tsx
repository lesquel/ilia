import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';

const THREAD_ROWS = 4;
const MODULE_GROUPS = 3;

/** A card's title and hint, as the surface `Card` draws them. */
function CardHeadBone() {
  return (
    <View style={styles.cardHead}>
      <Bone width="45%" height={18} />
      <Bone width="75%" height={13} />
    </View>
  );
}

/**
 * The module's discussions before they arrive: one card of rows, each a
 * two-line title over the author (avatar and name), replies and last activity.
 */
export function ForumScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Cargando el foro">
      <BoneCard style={styles.list}>
        {Array.from({ length: THREAD_ROWS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.row,
              index === 0 ? undefined : { borderTopWidth: 1, borderTopColor: theme.colors.divider },
            ]}
          >
            <Bone height={17} width={index % 2 === 0 ? '80%' : '65%'} />
            <View style={styles.facts}>
              <View style={styles.author}>
                <Bone circle height={24} />
                <Bone width={90} height={13} />
              </View>
              <Bone width={84} height={13} />
              <Bone width={150} height={13} />
            </View>
          </View>
        ))}
      </BoneCard>
    </Skeleton>
  );
}

/**
 * The course's forums before they arrive: the card of modules, each a title
 * over its forum links, as the module picker draws them.
 */
export function ForumModulesSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Buscando los foros del curso">
      <BoneCard style={styles.card}>
        <CardHeadBone />
        <View style={styles.moduleList}>
          {Array.from({ length: MODULE_GROUPS }, (_, index) => (
            <View key={index} style={styles.moduleGroup}>
              <Bone width="50%" height={15} />
              <View style={[styles.moduleLink, { borderColor: theme.colors.divider }]}>
                <Bone width={100} height={14} />
                <Bone width={72} height={14} />
              </View>
            </View>
          ))}
        </View>
      </BoneCard>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20.4, gap: 13.6 },
  cardHead: { gap: 6 },
  list: { padding: 20.4, gap: 0, paddingVertical: 6.8 },
  row: { gap: 6.8, paddingVertical: 13.6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 13.6, rowGap: 3.4 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moduleList: { gap: 8 },
  moduleGroup: { gap: 7 },
  moduleLink: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});
