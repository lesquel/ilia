import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  useCompleteLesson,
  useLesson,
} from '@/features/enrollment/application/use-enrollment';
import { LessonStudio } from '@/features/enrollment/presentation/lesson-studio';
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
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.chrome}>
        <Link href={`/catalog/${courseSlug}`} style={[styles.back, { color: theme.colors.accentAlt }]}>
          ← Curso
        </Link>
        <Text style={[styles.chromeTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {lesson.title}
        </Text>
        <Text style={[styles.chromeStep, { color: theme.colors.neutral[600] }]}>
          {lesson.position} / {lesson.totalLessons}
        </Text>
      </View>

      {lesson.mediaUrl ? (
        <View style={styles.media}>
          <LessonPlayer url={lesson.mediaUrl} />
        </View>
      ) : lesson.resourceRef ? (
        <LessonPlayerUnavailable />
      ) : null}

      {lesson.body ? (
        <LessonStudio
          body={lesson.body}
          onMarkComplete={() => complete.mutate(lesson.lessonId)}
          isCompleted={lesson.isCompleted}
          isCompletePending={complete.isPending}
          completeFailed={complete.isError}
          nextLessonTitle={lesson.next?.lessonTitle}
          onOpenNextLesson={
            lesson.next ? () => goTo(lesson.next!.lessonId) : undefined
          }
        />
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

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  back: {
    fontSize: 14,
    fontWeight: '600',
  },
  chromeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  chromeStep: {
    fontSize: 13,
  },
  media: {
    paddingHorizontal: 24,
  },
  placeholder: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    margin: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
  },
});
