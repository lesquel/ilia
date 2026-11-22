import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';

const COURSES = 2;
const FORUMS_PER_COURSE = 2;

/**
 * The learner's forums before they arrive: the "Foros de tus cursos" card with
 * one bordered block per course (icon, title, summary) and its module forums
 * indented under the title, as the loaded list lays them out.
 */
export function CommunityScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Buscando tus foros">
      <BoneCard style={styles.card}>
        <View style={styles.cardHead}>
          <Bone width="40%" height={18} />
          <Bone width={70} height={13} />
        </View>
        <View style={styles.list}>
          {Array.from({ length: COURSES }, (_, index) => (
            <View key={index} style={[styles.course, { borderColor: theme.colors.divider }]}>
              <View style={styles.courseHeading}>
                <Bone width={40} height={40} />
                <View style={styles.copy}>
                  <Bone width="60%" height={17} />
                  <Bone width="90%" height={14} />
                </View>
              </View>
              <View style={styles.modules}>
                <View style={styles.moduleGroup}>
                  <Bone width="45%" height={14} />
                  {Array.from({ length: FORUMS_PER_COURSE }, (_, forum) => (
                    <View key={forum} style={[styles.module, { borderColor: theme.colors.divider }]}>
                      <Bone width={110} height={14} />
                      <Bone width={72} height={14} />
                    </View>
                  ))}
                </View>
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
  list: { gap: 10 },
  course: { gap: 12, padding: 16, borderWidth: 1, borderRadius: 12 },
  courseHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  copy: { flex: 1, gap: 7 },
  modules: { gap: 12, marginLeft: 52 },
  moduleGroup: { gap: 7 },
  module: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
});
