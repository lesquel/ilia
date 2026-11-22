import { Link } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  LEVEL_LABELS,
  formatDuration,
  type CourseSummary,
} from '@/features/catalog/domain/entities';
import {
  catalogCallToAction,
  catalogProgressLine,
  type CatalogProgress,
} from '@/features/catalog/domain/catalog-progress';
import { CourseCoverArt } from '@/features/catalog/presentation/course-cover-art';
import { useCourseAccent } from '@/features/catalog/presentation/use-course-accent';

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

export function CourseCard({
  course,
  isStartHere = false,
  progress,
}: {
  course: CourseSummary;
  isStartHere?: boolean;
  /** Only for a course the teacher is enrolled in. */
  progress?: CatalogProgress;
}) {
  const theme = useTheme();
  const accent = useCourseAccent(course.slug);
  const clamped = progress ? Math.max(0, Math.min(100, Math.round(progress.percentage))) : 0;

  return (
    // `Link` and not an onPress handler: on web this renders a real anchor, so
    // the card is middle-clickable, right-clickable and shareable — which is the
    // whole reason courses are addressed by slug (TRD 4.5).
    <Link href={`/catalog/${course.slug}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${course.title}, nivel ${LEVEL_LABELS[course.level]}${
          progress ? `, ${clamped}% completado` : ''
        }`}
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
                borderColor: hovered ? accent.mid : theme.colors.divider,
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
                // The level, in the course's own ink: every cover in a row
                // shares a level, so a big step number only repeated itself.
                <View style={styles.coverTags}>
                <View
                  style={[
                    styles.levelChip,
                    { backgroundColor: theme.colors.surface, borderRadius: PILL_RADIUS },
                  ]}
                >
                  <Text
                    style={[
                      styles.levelLabel,
                      { color: accent.ink },
                    ]}
                  >
                    {LEVEL_LABELS[course.level]}
                  </Text>
                </View>
                  {isStartHere ? (
                    <View
                      style={[
                        styles.startHint,
                        { backgroundColor: accent.ink, borderRadius: PILL_RADIUS },
                      ]}
                    >
                      <Text style={styles.startHintLabel}>Empieza aquí</Text>
                    </View>
                  ) : null}
                </View>
              }
            />

            <View style={styles.body}>
              <Text
                style={[
                  styles.title,
                  { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
                ]}
                numberOfLines={2}
                accessibilityRole="header"
              >
                {course.title}
              </Text>

              <Text
                style={[styles.summary, { color: theme.colors.neutral[600] }]}
                numberOfLines={2}
              >
                {course.summary}
              </Text>

              <View style={styles.bottom}>
                {progress ? (
                  <View style={styles.progress}>
                    <View style={styles.progressHead}>
                      <Text
                        style={[styles.progressLine, { color: theme.colors.neutral[700] }]}
                        numberOfLines={1}
                      >
                        {catalogProgressLine(progress)}
                      </Text>
                      <Text style={[styles.progressValue, { color: accent.ink }]}>
                        {clamped}%
                      </Text>
                    </View>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityValue={{ min: 0, max: 100, now: clamped }}
                      style={[styles.track, { backgroundColor: theme.colors.neutral[200] }]}
                    >
                      <View
                        style={[styles.fill, { width: `${clamped}%`, backgroundColor: accent.ink }]}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                  <Text
                    style={[styles.meta, { color: theme.colors.neutral[600] }]}
                    numberOfLines={1}
                  >
                    {course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'} ·{' '}
                    {formatDuration(course.durationSeconds)}
                  </Text>
                  <View style={styles.footerAction}>
                    <Text style={[styles.footerLabel, { color: accent.ink }]}>
                      {catalogCallToAction(progress)}
                    </Text>
                    <Icon glyph={ArrowRight} size={16} color={accent.ink} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const PILL_RADIUS = 999;

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
  levelChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 8,
  },
  coverTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  // On the cover, beside the level: it marks the course, it does not push
  // every other card's title down to make room for itself.
  startHint: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  startHintLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  // No reserved heights: a one-line title sits right above its summary, and
  // the footer still lines up across a row because it is pushed to the bottom.
  title: {
    fontSize: 19,
    lineHeight: 23,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
  },
  bottom: {
    marginTop: 'auto',
    paddingTop: 4,
    gap: 10,
  },
  progress: {
    gap: 6,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLine: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: PILL_RADIUS,
  },
  meta: {
    flexShrink: 1,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
