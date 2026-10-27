import { Link } from 'expo-router';
import { ArrowRight, BookOpen, Clock } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { INSTITUTE_SHORT_NAME } from '@/core/brand';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  LEVEL_LABELS,
  formatDuration,
  type CourseSummary,
  type Level,
} from '@/features/catalog/domain/entities';
import { CourseCoverArt } from '@/features/catalog/presentation/course-cover-art';

const PATH_STEP: Record<Level, string> = {
  beginner: '1',
  intermediate: '2',
  expert: '3',
};

function cardLift(raised: boolean) {
  if (Platform.OS === 'web') {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    return {
      boxShadow: raised
        ? '0 18px 40px rgba(27, 112, 254, 0.16)'
        : '0 10px 28px rgba(17, 17, 17, 0.06)',
      transform: [{ translateY: raised && !reduceMotion ? -3 : 0 }],
      transitionProperty: 'box-shadow, transform, border-color',
      transitionDuration: reduceMotion ? '0ms' : '160ms',
    };
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
        {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
          // Every visual style lives on this inner View, never on the Pressable.
          // `asChild` makes expo-router render the Pressable *as* the anchor on
          // web, and the anchor drops the Pressable's own style — which silently
          // leaves the card with no padding, border or background.
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: hovered ? theme.colors.accentRamp[300] : theme.colors.divider,
                borderRadius: theme.radius.lg,
                opacity: pressed ? 0.92 : 1,
                overflow: 'hidden',
                ...cardLift(Boolean(hovered)),
              },
            ]}
          >
            <CourseCoverArt
              courseSlug={course.slug}
              overlay={
                <View style={styles.coverCopy}>
                  <Text style={[styles.pathNumber, { color: theme.colors.accentAlt }]}>
                    {PATH_STEP[course.level]}
                  </Text>
                  <Text style={[styles.levelLabel, { color: theme.colors.accentRamp[700] }]}>
                    {LEVEL_LABELS[course.level]}
                  </Text>
                </View>
              }
            />

            <View style={styles.body}>
              <View style={styles.startHintSlot}>
                {isStartHere ? (
                  <Text style={[styles.startHint, { color: theme.colors.accentAlt }]}>
                    Empieza aquí
                  </Text>
                ) : null}
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2} accessibilityRole="header">
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

              <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                <Text
                  style={[styles.institute, { color: theme.colors.neutral[600] }]}
                  numberOfLines={1}
                >
                  Instituto {INSTITUTE_SHORT_NAME}
                </Text>
                <View style={styles.footerAction}>
                  <Text style={[styles.footerLabel, { color: theme.colors.accentAlt }]}>
                    Ver el curso
                  </Text>
                  <Icon glyph={ArrowRight} size={16} color={theme.colors.accent} />
                </View>
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
    height: '100%',
  },
  card: {
    flex: 1,
    borderWidth: 1,
    height: '100%',
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
    flex: 1,
    padding: 20.4,
    gap: 8,
  },
  startHintSlot: {
    minHeight: 16,
    justifyContent: 'center',
  },
  startHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    minHeight: 52,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
  },
  institute: {
    flexShrink: 1,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
