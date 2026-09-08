import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { LEVEL_LABELS } from '@/features/catalog/domain/entities';
import { useSession } from '@/features/auth';
import { useMyCourses } from '@/features/enrollment/application/use-enrollment';
import { callToAction, type EnrolledCourse } from '@/features/enrollment/domain/entities';

export function MyCoursesScreen() {
  const theme = useTheme();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { courses, isLoading, error, refetch } = useMyCourses();

  if (isCheckingSession) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          title="Iniciá sesión para ver tus cursos"
          hint="Tu progreso queda guardado en tu cuenta."
        />
        <Link href="/login" style={[styles.link, { color: theme.colors.accent }]}>
          Iniciar sesión
        </Link>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={courses}
      keyExtractor={(item) => item.course.id}
      renderItem={({ item }) => <EnrolledCourseCard enrolled={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Mis cursos</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Retomá donde quedaste.
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando tus cursos…" />
        ) : (
          <EmptyState
            title="Todavía no te inscribiste en ningún curso"
            hint="Explorá el catálogo y empezá por la ruta básica."
          />
        )
      }
    />
  );
}

function EnrolledCourseCard({ enrolled }: { enrolled: EnrolledCourse }) {
  const theme = useTheme();
  const { course, progress } = enrolled;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text style={[styles.level, { color: theme.colors.accentRamp[700] }]}>
        {LEVEL_LABELS[course.level]}
      </Text>

      <Text style={[styles.courseTitle, { color: theme.colors.text }]}>{course.title}</Text>

      <ProgressBar
        percentage={progress.percentage}
        label={`${progress.completedLessons} de ${progress.totalLessons} lecciones · ${progress.percentage}%`}
      />

      {/* The resume pointer, spelled out. "Continuar" alone makes the teacher
          open the course to find out what they are continuing. */}
      {progress.nextLesson ? (
        <Text style={[styles.next, { color: theme.colors.neutral[600] }]} numberOfLines={1}>
          Sigue: {progress.nextLesson.moduleTitle} · {progress.nextLesson.lessonTitle}
        </Text>
      ) : progress.isComplete ? (
        <Text style={[styles.next, { color: theme.colors.accentRamp[700] }]}>
          Curso completado 🎉
        </Text>
      ) : null}

      {/* Straight to the lesson the teacher left off at. Landing on the course
          page and making them find it again is the friction PRD E-04 exists to
          remove. */}
      <Link
        href={
          progress.nextLesson
            ? `/catalog/${course.slug}/lessons/${progress.nextLesson.lessonId}`
            : `/catalog/${course.slug}`
        }
        asChild
      >
        <Pressable accessibilityRole="link">
          {({ pressed }) => (
            <View
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.buttonLabel}>{callToAction(progress)}</Text>
            </View>
          )}
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 27.2,
  },
  content: {
    padding: 20.4,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
  },
  header: {
    gap: 6.8,
    marginBottom: 6.8,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
  },
  link: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    padding: 20.4,
    gap: 10.2,
  },
  level: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  next: {
    fontSize: 13,
  },
  button: {
    marginTop: 3.4,
    paddingVertical: 10.2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: {
    color: '#f2f2f3',
    fontSize: 15,
    fontWeight: '600',
  },
});
