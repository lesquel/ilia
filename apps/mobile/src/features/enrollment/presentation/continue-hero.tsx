import type { Href } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { Card, OutlineLink, PrimaryLink, Tag, useIsWide } from '@/core/ui/surface';
import { LEVEL_LABELS, useCourse } from '@/features/catalog';
import { CourseCoverArt } from '@/features/catalog/presentation/course-cover-art';
import { resumeTargetForCourse } from '@/features/enrollment/domain/resume';
import type { EnrolledCourse } from '@/features/enrollment/domain/entities';

/** The one course to pick up again: where it stands and the way back in. */
export function ContinueHero({ enrolled }: { enrolled: EnrolledCourse }) {
  const theme = useTheme();
  const isWide = useIsWide();

  const { course, progress } = enrolled;
  const { course: detail, isLoading } = useCourse(course.slug);

  const target =
    detail && !isLoading
      ? resumeTargetForCourse(course.slug, course.instructorName, detail.modules, progress)
      : {
          href: progress.nextLesson
            ? `/catalog/${course.slug}/lessons/${progress.nextLesson.lessonId}`
            : `/catalog/${course.slug}`,
          contextLine: [
            progress.nextLesson?.moduleTitle,
            progress.nextLesson?.lessonTitle,
            course.instructorName,
          ]
            .filter(Boolean)
            .join(' · '),
        };

  return (
    <Card style={[styles.shell, isWide ? styles.shellWide : undefined]}>
      {/* The cover has no width of its own: beside the copy it needs one, or
          it collapses and the block reads as a plain white box. */}
      <View
        style={[
          isWide ? styles.coverWide : undefined,
          { backgroundColor: theme.colors.accentRamp[100] },
        ]}
      >
        <CourseCoverArt courseSlug={course.slug} />
      </View>

      <View
        style={styles.body}
        accessibilityRole="summary"
        accessibilityLabel={`Curso en progreso: ${course.title}`}
      >
        <View style={styles.tags}>
          <Tag label="Curso en progreso" tone="accent" filled />
          <Tag label={LEVEL_LABELS[course.level]} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">{course.title}</Text>
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
          <PrimaryLink
            href={target.href as Href}
            label="Continuar curso"
            glyph={ArrowRight}
          />
          <OutlineLink
            href={`/catalog/${course.slug}`}
            label="Ver temario"
            accessibilityLabel="Ver temario del curso"
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // The cover runs to the edge of the card, so the padding moves to the copy.
  shell: { padding: 0, gap: 0, overflow: 'hidden' },
  shellWide: { flexDirection: 'row', alignItems: 'stretch' },
  coverWide: { width: 340, justifyContent: 'center' },
  body: {
    padding: 20.4,
    gap: 10.2,
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30, letterSpacing: -0.4 },
  context: { fontSize: 14, lineHeight: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  progressTrack: { flex: 1 },
  percent: { fontSize: 20, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2, marginTop: 3.4 },
});
