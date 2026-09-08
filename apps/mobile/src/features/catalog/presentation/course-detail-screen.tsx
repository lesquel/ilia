import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { useCourse } from '@/features/catalog/application/use-catalog';
import {
  LESSON_KIND_LABELS,
  LEVEL_LABELS,
  formatDuration,
  type Module,
} from '@/features/catalog/domain/entities';

/**
 * The course page.
 *
 * Enrollment is passed in as a slot rather than imported: this feature must not
 * depend on `enrollment`, or the dependency runs in both directions and the two
 * stop being separable. The route composes them.
 */
export interface CourseDetailScreenProps {
  enrollmentSlot?: ReactNode;
  completedLessonIds?: string[];
  onLessonPress?: (lessonId: string) => void;
  pendingLessonId?: string | null;
}

export function CourseDetailScreen({
  enrollmentSlot,
  completedLessonIds = [],
  onLessonPress,
  pendingLessonId = null,
}: CourseDetailScreenProps) {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { course, isLoading, error, refetch } = useCourse(slug ?? '');

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando el curso…" />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.sm },
        ]}
      >
        <Text style={[styles.badgeText, { color: theme.colors.accentRamp[800] }]}>
          {LEVEL_LABELS[course.level]}
        </Text>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
      <Text style={[styles.summary, { color: theme.colors.neutral[700] }]}>{course.summary}</Text>

      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        {course.instructorName} · {course.lessonCount}{' '}
        {course.lessonCount === 1 ? 'lección' : 'lecciones'} ·{' '}
        {formatDuration(course.durationSeconds)}
      </Text>

      {enrollmentSlot}

      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

      <Text style={[styles.description, { color: theme.colors.text }]}>{course.description}</Text>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Temario</Text>

      {course.modules.length === 0 ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
          El temario de este curso todavía se está armando.
        </Text>
      ) : (
        course.modules.map((module) => (
          <ModuleBlock
            key={module.id}
            module={module}
            completedLessonIds={completedLessonIds}
            onLessonPress={onLessonPress}
            pendingLessonId={pendingLessonId}
          />
        ))
      )}
    </ScrollView>
  );
}

function ModuleBlock({
  module,
  completedLessonIds,
  onLessonPress,
  pendingLessonId,
}: {
  module: Module;
  completedLessonIds: string[];
  onLessonPress?: (lessonId: string) => void;
  pendingLessonId: string | null;
}) {
  const theme = useTheme();

  return (
    <View
      style={[styles.module, { borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}
    >
      <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
        {module.position}. {module.title}
      </Text>

      {module.lessons.map((lesson) => {
        const done = completedLessonIds.includes(lesson.id);
        const pending = pendingLessonId === lesson.id;
        // Lessons are only interactive for an enrolled teacher. Otherwise they
        // are a table of contents, and a button that silently does nothing is
        // worse than no button.
        const interactive = Boolean(onLessonPress);

        const row = (
          <View style={styles.lesson}>
            <Text
              style={[
                styles.check,
                {
                  color: done ? theme.colors.accent : theme.colors.neutral[400],
                  opacity: pending ? 0.4 : 1,
                },
              ]}
            >
              {done ? '●' : '○'}
            </Text>
            <Text style={[styles.lessonKind, { color: theme.colors.accentRamp[700] }]}>
              {LESSON_KIND_LABELS[lesson.kind]}
            </Text>
            <Text
              style={[
                styles.lessonTitle,
                {
                  color: done ? theme.colors.neutral[600] : theme.colors.text,
                },
              ]}
            >
              {lesson.title}
            </Text>
            <Text style={[styles.lessonDuration, { color: theme.colors.neutral[600] }]}>
              {formatDuration(lesson.durationSeconds)}
            </Text>
          </View>
        );

        if (!interactive) {
          return <View key={lesson.id}>{row}</View>;
        }

        return (
          <Pressable
            key={lesson.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done, disabled: pending }}
            accessibilityLabel={`${lesson.title}, ${done ? 'completada' : 'pendiente'}`}
            disabled={pending}
            onPress={() => onLessonPress?.(lesson.id)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            {row}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20.4,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  badge: {
    alignSelf: 'flex-start',
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
    fontSize: 34,
    fontWeight: '600',
    lineHeight: 40,
  },
  summary: {
    fontSize: 17,
    lineHeight: 24,
  },
  meta: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 13.6,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 13.6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 3.4,
  },
  module: {
    borderWidth: 1,
    padding: 13.6,
    gap: 6.8,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3.4,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    paddingVertical: 6.8,
  },
  check: {
    fontSize: 15,
    width: 16,
  },
  lessonKind: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 104,
  },
  lessonTitle: {
    fontSize: 14,
    flex: 1,
  },
  lessonDuration: {
    fontSize: 12,
  },
});
