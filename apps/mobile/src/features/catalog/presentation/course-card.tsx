import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ArrowRight, BookOpen, Clock } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  LEVEL_LABELS,
  formatDuration,
  type CourseSummary,
  type Level,
} from '@/features/catalog/domain/entities';
import { coverForCourseSlug } from '@/features/catalog/presentation/course-covers';

const PATH_STEP: Record<Level, string> = {
  beginner: '1',
  intermediate: '2',
  expert: '3',
};

function cardLift() {
  if (Platform.OS === 'web') {
    return { boxShadow: '0 10px 28px rgba(17, 17, 17, 0.06)' };
  }

  return {
    shadowColor: '#111111',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  };
}

export function CourseCard({ course }: { course: CourseSummary }) {
  const theme = useTheme();
  const isStartHere = course.level === 'beginner';
  const cover = coverForCourseSlug(course.slug);

  return (
    // `Link` and not an onPress handler: on web this renders a real anchor, so
    // the card is middle-clickable, right-clickable and shareable — which is the
    // whole reason courses are addressed by slug (TRD 4.5).
    <Link href={`/catalog/${course.slug}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${course.title}, nivel ${LEVEL_LABELS[course.level]}`}
        style={styles.pressable}
      >
        {({ pressed }) => (
          // Every visual style lives on this inner View, never on the Pressable.
          // `asChild` makes expo-router render the Pressable *as* the anchor on
          // web, and the anchor drops the Pressable's own style — which silently
          // leaves the card with no padding, border or background.
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
                opacity: pressed ? 0.92 : 1,
                overflow: 'hidden',
                ...cardLift(),
              },
            ]}
          >
            <View
              style={[styles.cover, { backgroundColor: theme.colors.accentRamp[100] }]}
            >
              {cover ? (
                <Image
                  source={cover}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View style={styles.coverCopy}>
                <Text style={[styles.pathNumber, { color: theme.colors.accent }]}>
                  {PATH_STEP[course.level]}
                </Text>
                <Text style={[styles.levelLabel, { color: theme.colors.accentRamp[700] }]}>
                  {LEVEL_LABELS[course.level]}
                </Text>
              </View>
            </View>

            <View style={styles.body}>
              {isStartHere ? (
                <Text style={[styles.startHint, { color: theme.colors.accent }]}>
                  Empieza aquí
                </Text>
              ) : null}

              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
                {course.title}
              </Text>

              <Text
                style={[styles.summary, { color: theme.colors.neutral[600] }]}
                numberOfLines={3}
              >
                {course.summary}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon glyph={BookOpen} size={14} color={theme.colors.neutral[600]} />
                  <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
                    {course.lessonCount}{' '}
                    {course.lessonCount === 1 ? 'lección' : 'lecciones'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon glyph={Clock} size={14} color={theme.colors.neutral[600]} />
                  <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
                    {formatDuration(course.durationSeconds)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.instructor, { color: theme.colors.neutral[600] }]}>
                {course.instructorName}
              </Text>

              <View style={styles.footer}>
                <Text style={[styles.footerLabel, { color: theme.colors.accent }]}>
                  Ver el curso
                </Text>
                <Icon glyph={ArrowRight} size={16} color={theme.colors.accent} />
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderWidth: 1,
  },
  cover: {
    minHeight: 168,
    paddingHorizontal: 20.4,
    paddingVertical: 18,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  coverCopy: {
    gap: 2,
  },
  pathNumber: {
    fontSize: 40,
    fontWeight: '600',
    lineHeight: 40,
    letterSpacing: -1,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: 20.4,
    gap: 8,
  },
  startHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
  },
  instructor: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  footerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
