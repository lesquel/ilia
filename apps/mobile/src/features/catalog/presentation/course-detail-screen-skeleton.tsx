import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * The course page before the course arrives: the institute card on the left
 * (sticky column on a wide window, on top on a phone) and the syllabus
 * timeline beside it, at the same paddings and widths as `CourseDetailScreen`.
 */
export function CourseDetailScreenSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Skeleton label="Cargando el curso" style={styles.group}>
        {Platform.OS === 'web' ? (
          <View style={styles.backLink}>
            <Bone height={14} width={128} />
          </View>
        ) : null}

        <View style={[styles.split, isWide ? styles.splitWide : undefined]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
              },
              isWide ? styles.cardWide : undefined,
            ]}
          >
            {/* The tinted stage: kicker row plus Lía at 148 px. */}
            <Bone height={STAGE_HEIGHT} radius={theme.radius.md} style={styles.stage} />
            <Bone height={22} width={112} />
            <View style={styles.title}>
              <Bone height={32} width="92%" />
              <Bone height={32} width="58%" />
            </View>
            <BoneLines lines={3} height={16} gap={8} lastWidth="72%" />
            <View style={styles.facts}>
              <Bone height={13} width={96} />
              <Bone height={13} width={72} />
              <Bone height={13} width={88} />
              <Bone height={13} width={150} />
            </View>
            {/* The enrollment slot: a rule, a line of hint and the button. */}
            <View style={[styles.panel, { borderTopColor: theme.colors.divider }]}>
              <BoneLines lines={2} height={14} gap={6} lastWidth="80%" />
              <Bone height={48} radius={theme.radius.md} />
            </View>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineHead}>
              <Bone height={22} width={112} />
              <Bone height={13} width={140} />
            </View>
            <View style={styles.rail}>
              {STATION_ROWS.map((rowCount, stationIndex) => (
                <View
                  key={stationIndex}
                  style={[
                    styles.station,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.divider,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Bone height={12} width={12} radius={0} style={styles.node} />
                  <View style={styles.stationHead}>
                    <Bone height={16} width="58%" />
                  </View>
                  {Array.from({ length: rowCount }, (_, rowIndex) => (
                    <View
                      key={rowIndex}
                      style={[
                        styles.row,
                        {
                          borderBottomColor:
                            rowIndex === rowCount - 1 ? 'transparent' : theme.colors.divider,
                        },
                      ]}
                    >
                      <Bone height={10} width={10} radius={0} />
                      <Bone height={12} width={22} />
                      <View style={styles.rowTitle}>
                        <Bone height={14} width={rowIndex % 2 === 0 ? '78%' : '62%'} />
                      </View>
                      <Bone height={12} width={40} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Skeleton>
    </ScrollView>
  );
}

/** Kicker row (14 + 16), gap 6, Lía (148) and her padding (10). */
const STAGE_HEIGHT = 194;
/** Rows per placeholder chapter: enough to read as a syllabus. */
const STATION_ROWS = [3, 3, 2];

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  group: {
    gap: 0,
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 10,
  },
  split: {
    gap: 28,
  },
  splitWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 36,
  },
  card: {
    borderWidth: 1,
    padding: 22,
    gap: 10,
  },
  cardWide: {
    width: 320,
    flexShrink: 0,
  },
  stage: {
    marginBottom: 6,
  },
  title: {
    gap: 4,
  },
  facts: {
    gap: 8,
    marginTop: 4,
  },
  panel: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10.2,
    marginTop: 8,
  },
  timeline: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  timelineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  rail: {
    position: 'relative',
    paddingLeft: 28,
  },
  station: {
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  node: {
    position: 'absolute',
    left: -29,
    top: 20,
  },
  stationHead: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowTitle: {
    flex: 1,
  },
});
