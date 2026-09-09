import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { LESSON_KIND_LABELS, formatDuration } from '@/features/catalog/domain/entities';
import {
  useCompleteLesson,
  useLesson,
} from '@/features/enrollment/application/use-enrollment';
import {
  LessonPlayer,
  LessonPlayerUnavailable,
} from '@/features/enrollment/presentation/lesson-player';

export function LessonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { slug, lessonId } = useLocalSearchParams<{ slug: string; lessonId: string }>();

  const courseSlug = slug ?? '';
  const { lesson, isLoading, error, refetch } = useLesson(courseSlug, lessonId ?? '');
  const complete = useCompleteLesson(courseSlug);

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando la lección…" />
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  const goTo = (id: string) => router.replace(`/catalog/${courseSlug}/lessons/${id}`);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Link href={`/catalog/${courseSlug}`} style={[styles.back, { color: theme.colors.accent }]}>
        ← Volver al curso
      </Link>

      <ProgressBar
        percentage={(lesson.position / lesson.totalLessons) * 100}
        label={`Lección ${lesson.position} de ${lesson.totalLessons} · ${lesson.moduleTitle}`}
      />

      <Text style={[styles.kind, { color: theme.colors.accentRamp[700] }]}>
        {LESSON_KIND_LABELS[lesson.kind]} · {formatDuration(lesson.durationSeconds)}
      </Text>

      <Text style={[styles.title, { color: theme.colors.text }]}>{lesson.title}</Text>

      {/* Only when there is media to play. Announcing a missing player above a
          lesson that does have written material contradicts itself.
          `mediaUrl` is signed and short-lived; `resourceRef` without one means
          the storage could not resolve it. */}
      {lesson.mediaUrl ? (
        <LessonPlayer url={lesson.mediaUrl} />
      ) : lesson.resourceRef ? (
        <LessonPlayerUnavailable />
      ) : null}

      {lesson.body ? (
        <Text style={[styles.body, { color: theme.colors.text }]}>{lesson.body}</Text>
      ) : (
        <View
          style={[
            styles.placeholder,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.placeholderText, { color: theme.colors.neutral[600] }]}>
            El material de esta lección todavía se está produciendo.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={complete.isPending || lesson.isCompleted}
        onPress={() => complete.mutate(lesson.lessonId)}
        style={({ pressed }) => [
          styles.completeButton,
          {
            backgroundColor: lesson.isCompleted ? 'transparent' : theme.colors.accent,
            borderColor: lesson.isCompleted ? theme.colors.divider : theme.colors.accent,
            borderRadius: theme.radius.md,
            opacity: complete.isPending ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {complete.isPending ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <Text
            style={[
              styles.completeLabel,
              { color: lesson.isCompleted ? theme.colors.neutral[600] : '#f2f2f3' },
            ]}
          >
            {lesson.isCompleted ? '✓ Lección completada' : 'Marcar como completada'}
          </Text>
        )}
      </Pressable>

      <View style={styles.nav}>
        {lesson.previous ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => goTo(lesson.previous!.lessonId)}
            style={({ pressed }) => [styles.navItem, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.navHint, { color: theme.colors.neutral[600] }]}>Anterior</Text>
            <Text style={[styles.navTitle, { color: theme.colors.accent }]} numberOfLines={1}>
              {lesson.previous.lessonTitle}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.navItem} />
        )}

        {lesson.next ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => goTo(lesson.next!.lessonId)}
            style={({ pressed }) => [
              styles.navItem,
              styles.navRight,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.navHint, { color: theme.colors.neutral[600] }]}>Siguiente</Text>
            <Text style={[styles.navTitle, { color: theme.colors.accent }]} numberOfLines={1}>
              {lesson.next.lessonTitle}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.navItem, styles.navRight]}>
            <Text style={[styles.navHint, { color: theme.colors.neutral[600] }]}>
              Última lección
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20.4,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
  },
  back: {
    fontSize: 14,
    fontWeight: '600',
  },
  kind: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 36,
  },
  placeholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
  },
  completeButton: {
    borderWidth: 1,
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 6.8,
  },
  completeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 13.6,
    marginTop: 6.8,
  },
  navItem: {
    flex: 1,
    gap: 3.4,
  },
  navRight: {
    alignItems: 'flex-end',
  },
  navHint: {
    fontSize: 12,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
