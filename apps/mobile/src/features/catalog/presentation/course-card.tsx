import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import {
  LEVEL_LABELS,
  formatDuration,
  type CourseSummary,
} from '@/features/catalog/domain/entities';

export function CourseCard({ course }: { course: CourseSummary }) {
  const theme = useTheme();

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
                opacity: pressed ? 0.85 : 1,
                overflow: 'hidden',
              },
            ]}
          >
            <View style={styles.markBar}>
              <View style={styles.signalSquare} />
            </View>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.accentRamp[100],
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                  {LEVEL_LABELS[course.level]}
                </Text>
              </View>
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
              {course.title}
            </Text>

            <Text
              style={[styles.summary, { color: theme.colors.neutral[600] }]}
              numberOfLines={2}
            >
              {course.summary}
            </Text>

            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
              {course.instructorName} · {course.lessonCount}{' '}
              {course.lessonCount === 1 ? 'lección' : 'lecciones'} ·{' '}
              {formatDuration(course.durationSeconds)}
            </Text>
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
    padding: 20.4,
    paddingTop: 16,
    gap: 6.8,
  },
  markBar: {
    height: 8,
    marginTop: -20.4,
    marginHorizontal: -20.4,
    marginBottom: 16,
    backgroundColor: '#111111',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  signalSquare: {
    width: 8,
    height: 8,
    backgroundColor: '#1b70fe',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 6.8,
    paddingVertical: 3.4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    marginTop: 3.4,
  },
});
