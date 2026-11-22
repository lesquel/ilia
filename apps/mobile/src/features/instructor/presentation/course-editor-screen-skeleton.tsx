import { ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';

const PLACEHOLDER_MODULES = 2;
const PLACEHOLDER_LESSONS = 3;

/**
 * The course editor before the course arrives: the back link, the course card
 * (tag, title, address, facts, actions, details form) and the syllabus with its
 * module cards, in the same column the editor uses.
 */
export function CourseEditorScreenSkeleton() {
  const theme = useTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <Skeleton label="Cargando el curso" style={styles.group}>
        <View style={styles.backLink}>
          <Bone width={96} height={14} />
        </View>

        <BoneCard style={styles.card}>
          <Bone width={92} height={24} />
          <View style={styles.headText}>
            <Bone height={30} width="70%" />
            <Bone height={13} width="40%" />
          </View>
          <View style={styles.facts}>
            <Bone width={78} height={13} />
            <Bone width={86} height={13} />
            <Bone width={60} height={13} />
          </View>
          <View style={styles.actions}>
            <Bone width={120} height={44} radius={theme.radius.md} />
            <Bone width={210} height={44} radius={theme.radius.md} />
          </View>
          <View style={styles.form}>
            <Bone width={110} height={13} />
            <Bone height={44} radius={theme.radius.md} />
            <Bone width={90} height={13} />
            <Bone height={90} radius={theme.radius.md} />
          </View>
        </BoneCard>

        <View style={styles.sectionHead}>
          <Bone width={110} height={22} />
          <Bone width={70} height={13} />
        </View>

        {Array.from({ length: PLACEHOLDER_MODULES }, (_, moduleIndex) => (
          <BoneCard key={moduleIndex} style={styles.card}>
            <Bone height={17} width="55%" />
            <View>
              {Array.from({ length: PLACEHOLDER_LESSONS }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.item,
                    { borderTopColor: index === 0 ? 'transparent' : theme.colors.divider },
                  ]}
                >
                  <Bone width={18} height={12} />
                  <View style={styles.itemTitle}>
                    <Bone height={14} width={index % 2 === 0 ? '75%' : '60%'} />
                  </View>
                  <Bone width={48} height={12} />
                </View>
              ))}
            </View>
            <Bone width={170} height={44} radius={theme.radius.md} />
          </BoneCard>
        ))}

        <BoneCard style={styles.card}>
          <Bone height={18} width={140} />
          <BoneLines lines={1} height={13} lastWidth="65%" />
          <Bone height={44} radius={theme.radius.md} />
        </BoneCard>
      </Skeleton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  group: { gap: 13.6 },
  backLink: { alignSelf: 'flex-start', paddingVertical: 6 },
  card: { padding: 20.4, gap: 13.6 },
  headText: { gap: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 13.6, rowGap: 6.8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10.2, flexWrap: 'wrap' },
  form: { gap: 6.8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13.6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    paddingVertical: 13.6,
    borderTopWidth: 1,
  },
  itemTitle: { flex: 1 },
});
