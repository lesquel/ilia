import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { ErrorState } from '@/core/ui/state-view';
import { useCourse, useCourseAccent } from '@/features/catalog';
import {
  useCompleteLesson,
  useCourseProgress,
  useLesson,
  useRecordLessonPosition,
} from '@/features/enrollment/application/use-enrollment';
import {
  lessonStepStates,
  lessonStepStatesByPosition,
} from '@/features/enrollment/domain/lesson-steps';
import { lessonColumn, lessonWideColumn } from '@/features/enrollment/presentation/lesson-layout';
import { LessonTopBar } from '@/features/enrollment/presentation/lesson-top-bar';
import { LessonStudio } from '@/features/enrollment/presentation/lesson-studio';
import { LessonQuiz } from '@/features/enrollment/presentation/lesson-quiz';
import {
  LessonPlayer,
  LessonPlayerUnavailable,
} from '@/features/enrollment/presentation/lesson-player';
import { LessonScreenSkeleton } from '@/features/enrollment/presentation/lesson-screen-skeleton';

export function LessonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { slug, lessonId } = useLocalSearchParams<{ slug: string; lessonId: string }>();

  const courseSlug = slug ?? '';
  const { lesson, isLoading, error, refetch } = useLesson(courseSlug, lessonId ?? '');
  const complete = useCompleteLesson(courseSlug);
  const recordPosition = useRecordLessonPosition(courseSlug);
  const isWide = useWindowDimensions().width >= breakpoint.compact;
  // The course's own color and name, and which lessons are done, for the top
  // bar. Both are usually cached from the course page; the bar works without.
  const accent = useCourseAccent(courseSlug);
  const { course } = useCourse(courseSlug);
  const { progress } = useCourseProgress(courseSlug);

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LessonScreenSkeleton />
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
  const isStudio = Boolean(lesson.body) && lesson.kind !== 'quiz';
  // A studio lesson on a wide screen splits into scene + Lía; the bar follows.
  const column = isStudio && isWide ? lessonWideColumn : lessonColumn;

  const courseLessonIds = course
    ? [...course.modules]
        .sort((a, b) => a.position - b.position)
        .flatMap((module) => [...module.lessons].sort((a, b) => a.position - b.position))
        .map((item) => item.id)
    : [];
  const steps =
    progress && courseLessonIds.includes(lesson.lessonId)
      ? lessonStepStates({
          lessonIds: courseLessonIds,
          currentLessonId: lesson.lessonId,
          completedLessonIds: progress.completedLessonIds,
        })
      : lessonStepStatesByPosition(lesson.position, lesson.totalLessons);

  const media = lesson.mediaUrl ? (
    <View style={isStudio && isWide ? undefined : [styles.media, lessonColumn]}>
      <LessonPlayer
        key={`${lesson.lessonId}:${lesson.mediaUrl}:${lesson.captionsUrl ?? ''}`}
        url={lesson.mediaUrl}
        captionsUrl={lesson.captionsUrl}
        posterUrl={lesson.posterUrl}
        resumePositionSeconds={lesson.resumePositionSeconds}
        accentColor={accent.ink}
        onPositionChange={(positionSeconds) =>
          recordPosition.mutate({ lessonId: lesson.lessonId, positionSeconds })
        }
      />
    </View>
  ) : lesson.resourceRef ? (
    <LessonPlayerUnavailable />
  ) : null;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <LessonTopBar
        backHref={`/catalog/${courseSlug}`}
        courseTitle={course?.title ?? null}
        position={lesson.position}
        totalLessons={lesson.totalLessons}
        title={lesson.title}
        steps={steps}
        accent={accent}
        isWide={isWide}
        column={column}
      />

      {isStudio ? null : media}

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
          accent={accent}
          media={media}
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
  media: {
    paddingHorizontal: 24,
    paddingTop: 12,
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
