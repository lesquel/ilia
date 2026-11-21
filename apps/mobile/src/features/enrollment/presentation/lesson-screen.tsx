import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  useCompleteLesson,
  useLesson,
  useRecordLessonPosition,
} from '@/features/enrollment/application/use-enrollment';
import { LessonStudio } from '@/features/enrollment/presentation/lesson-studio';
import { LessonQuiz } from '@/features/enrollment/presentation/lesson-quiz';
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
  const recordPosition = useRecordLessonPosition(courseSlug);

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
  const isModuleComplete = !lesson.next || lesson.next.moduleId !== lesson.moduleId;
  const moduleProgress = lesson.moduleTotalLessons > 0
    ? Math.min(100, (lesson.modulePosition / lesson.moduleTotalLessons) * 100)
    : 0;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
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

      <View style={styles.moduleProgress} accessibilityRole="progressbar" accessibilityValue={{
        min: 0,
        max: lesson.moduleTotalLessons,
        now: lesson.modulePosition,
        text: `${lesson.moduleTitle}: lección ${lesson.modulePosition} de ${lesson.moduleTotalLessons}`,
      }}>
        <View style={styles.moduleProgressCopy}>
          <Text style={[styles.moduleTitle, { color: theme.colors.neutral[700] }]} numberOfLines={1}>
            {lesson.moduleTitle}
          </Text>
          <Text style={[styles.moduleStep, { color: theme.colors.neutral[600] }]}>
            {lesson.modulePosition} de {lesson.moduleTotalLessons}
          </Text>
        </View>
        <View style={[styles.moduleTrack, { backgroundColor: theme.colors.neutral[200] }]}>
          <View style={[styles.moduleFill, { width: `${moduleProgress}%`, backgroundColor: theme.colors.accent }]} />
        </View>
      </View>

      {lesson.mediaUrl ? (
        <View style={styles.media}>
          <LessonPlayer
            key={`${lesson.lessonId}:${lesson.mediaUrl}:${lesson.captionsUrl ?? ''}`}
            url={lesson.mediaUrl}
            captionsUrl={lesson.captionsUrl}
            resumePositionSeconds={lesson.resumePositionSeconds}
            onPositionChange={(positionSeconds) =>
              recordPosition.mutate({ lessonId: lesson.lessonId, positionSeconds })
            }
          />
        </View>
      ) : lesson.resourceRef ? (
        <LessonPlayerUnavailable />
      ) : null}

      {lesson.body && lesson.kind === 'quiz' ? (
        <LessonQuiz
          body={lesson.body}
          isModuleComplete={isModuleComplete}
          onMarkComplete={() => complete.mutate(lesson.lessonId)}
          isCompleted={lesson.isCompleted}
          isCompletePending={complete.isPending}
          completeFailed={complete.isError}
        />
      ) : lesson.body ? (
        <LessonStudio
          body={lesson.body}
          onMarkComplete={() => complete.mutate(lesson.lessonId)}
          isCompleted={lesson.isCompleted}
          isCompletePending={complete.isPending}
          completeFailed={complete.isError}
          nextLessonTitle={lesson.next?.lessonTitle}
          isModuleComplete={isModuleComplete}
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
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
  moduleProgress: { paddingHorizontal: 24, paddingBottom: 8, gap: 5 },
  moduleProgressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  moduleTitle: { flex: 1, fontSize: 12, fontWeight: '600' },
  moduleStep: { fontSize: 12, fontVariant: ['tabular-nums'] },
  moduleTrack: { height: 4, width: '100%', borderRadius: 99, overflow: 'hidden' },
  moduleFill: { height: '100%', borderRadius: 99 },
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
