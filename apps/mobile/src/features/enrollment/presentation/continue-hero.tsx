import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { useCourse } from '@/features/catalog';
import { CourseCoverArt } from '@/features/catalog/presentation/course-cover-art';
import {
  primaryCourseToContinue,
  resumeTargetForCourse,
} from '@/features/enrollment/domain/resume';
import type { EnrolledCourse } from '@/features/enrollment/domain/entities';

export function ContinueHero({ courses }: { courses: readonly EnrolledCourse[] }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  const primary = primaryCourseToContinue(courses);
  if (!primary) return null;

  const { course, progress } = primary;
  const { course: detail, isLoading } = useCourse(course.slug);

  const target =
    detail && !isLoading
      ? resumeTargetForCourse(course.slug, course.instructorName, detail.modules, progress)
      : progress.nextLesson
        ? {
            href: `/catalog/${course.slug}/lessons/${progress.nextLesson.lessonId}`,
            contextLine: [
              progress.nextLesson.moduleTitle,
              progress.nextLesson.lessonTitle,
              course.instructorName,
            ]
              .filter(Boolean)
              .join(' · '),
          }
        : { href: `/catalog/${course.slug}`, contextLine: course.instructorName };

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
        isWide ? styles.shellWide : undefined,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Curso en progreso: ${course.title}`}
    >
      <CourseCoverArt courseSlug={course.slug} />

      <View style={styles.body}>
        <Text style={[styles.kicker, { color: theme.colors.accent }]}>Curso en progreso</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
        {target.contextLine ? (
          <Text style={[styles.context, { color: theme.colors.neutral[600] }]} numberOfLines={2}>
            {target.contextLine}
          </Text>
        ) : null}

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <ProgressBar
              percentage={progress.percentage}
              label={`${progress.completedLessons} de ${progress.totalLessons} lecciones`}
            />
          </View>
          <Text style={[styles.percent, { color: theme.colors.text }]}>
            {Math.round(progress.percentage)}%
          </Text>
        </View>

        <View style={styles.actions}>
          <Link href={target.href} asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Continuar curso">
              {({ pressed }) => (
                <View
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radius.md,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryLabel}>Continuar curso</Text>
                </View>
              )}
            </Pressable>
          </Link>

          <Link href={`/catalog/${course.slug}`} asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Ver temario del curso">
              {({ pressed }) => (
                <View
                  style={[
                    styles.secondaryBtn,
                    {
                      borderColor: theme.colors.divider,
                      borderRadius: theme.radius.md,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>
                    Ver temario
                  </Text>
                </View>
              )}
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  body: {
    padding: 20,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  context: {
    fontSize: 13,
    lineHeight: 19,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
  },
  percent: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
