import { useLocalSearchParams } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, Skeleton } from '@/core/ui/skeleton';

import { useCourseAccent } from './use-course-accent';

/**
 * The course page before the course arrives, in the same frame as
 * `CourseDetailScreen`: the hero band already in the course's color (the slug
 * is known before the course is), the overlapping progress card, syllabus rows
 * and the side column, at the same paddings and widths.
 */
export function CourseDetailScreenSkeleton() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const accent = useCourseAccent(slug);
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.medium;
  const isPhone = width < breakpoint.compact;
  const gutter = isPhone ? 16 : 40;
  const surface = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg,
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Skeleton label="Cargando el curso">
        <View style={[styles.hero, { backgroundColor: accent.ink }]}>
          <View
            style={[
              styles.heroInner,
              {
                paddingHorizontal: gutter,
                paddingTop: isPhone ? 20 : 32,
                paddingBottom: isPhone ? 60 : 76,
              },
            ]}
          >
            <View style={styles.heroText}>
              {Platform.OS === 'web' ? <Bone height={14} width={128} style={styles.onInk} /> : null}
              <View style={styles.chips}>
                <Bone height={26} width={72} radius={999} style={styles.onInk} />
                <Bone height={26} width={150} radius={999} style={styles.onInk} />
              </View>
              <Bone height={isPhone ? 34 : 52} width="78%" style={styles.onInk} />
              <Bone height={17} width="62%" style={styles.onInk} />
              <Bone height={14} width="48%" style={styles.onInk} />
            </View>
            {isWide ? <View style={[styles.heroCover, { borderRadius: theme.radius.lg }]} /> : null}
          </View>
        </View>

        <View
          style={[styles.body, { paddingHorizontal: gutter }, isWide ? styles.bodyWide : undefined]}
        >
          <View style={styles.main}>
            <View
              style={[styles.progressCard, isPhone ? undefined : styles.progressCardRow, surface]}
            >
              <View style={styles.advance}>
                <Bone height={14} width="60%" />
                <Bone height={8} radius={999} />
              </View>
              <Bone height={48} width={isPhone ? '100%' : 200} radius={theme.radius.md} />
            </View>
            <View style={styles.syllabusHead}>
              <Bone height={22} width={220} />
            </View>
            {ROWS.map((row) => (
              <View
                key={row}
                style={[
                  styles.row,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
                ]}
              >
                <Bone circle height={30} />
                <Bone height={15} width="52%" />
              </View>
            ))}
          </View>

          <View style={[styles.side, isWide ? styles.sideWide : undefined]}>
            <View style={[styles.sideCard, surface]}>
              <Bone height={16} width={120} />
              <Bone height={14} width="90%" />
              <Bone height={14} width={110} />
            </View>
          </View>
        </View>
      </Skeleton>
    </ScrollView>
  );
}

const ROWS = [0, 1, 2, 3, 4, 5];

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  onInk: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  heroInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 32,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  heroCover: {
    width: 340,
    height: 248,
    marginBottom: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  body: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: 24,
  },
  bodyWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginTop: -36,
    gap: 8,
  },
  progressCard: {
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 4,
  },
  progressCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  advance: {
    flex: 1,
    gap: 10,
  },
  syllabusHead: {
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  side: {
    gap: 16,
  },
  sideWide: {
    width: 360,
    flexShrink: 0,
    paddingTop: 28,
  },
  sideCard: {
    borderWidth: 1,
    padding: 22,
    gap: 12,
  },
});
