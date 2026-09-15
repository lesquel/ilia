import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  LEVEL_LABELS,
  nextCourseAlongLearningPath,
  type CourseSummary,
} from '@/features/catalog/domain/entities';
import { coverForCourseSlug } from '@/features/catalog/presentation/course-covers';
import { useCourses } from '@/features/catalog';
import { useSession } from '@/features/auth';
import { useMyCourses } from '@/features/enrollment/application/use-enrollment';
import { callToAction, type EnrolledCourse } from '@/features/enrollment/domain/entities';

export function MyCoursesScreen() {
  const theme = useTheme();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { courses, isLoading, error, refetch } = useMyCourses();
  const { courses: catalog } = useCourses();

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
          title="Inicia sesión para ver tus cursos"
          hint="Tu progreso queda guardado en tu cuenta."
        />
        <Link
          href="/login?next=/my-courses"
          style={[styles.link, { color: theme.colors.accent }]}
        >
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

  const hasOnlyFinishedCourses =
    courses.length > 0 && courses.every((item) => item.progress.isComplete);

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={courses}
      keyExtractor={(item) => item.course.id}
      renderItem={({ item }) => (
        <EnrolledCourseCard enrolled={item} catalog={catalog} />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Mis cursos</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            {hasOnlyFinishedCourses
              ? 'Ya terminaste lo que tenías abierto. Sigue por la ruta.'
              : 'Retoma donde quedaste.'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando tus cursos…" />
        ) : (
          <EmptyState
            title="Todavía no te inscribiste en ningún curso"
            hint="Explora el catálogo y empieza por la ruta básica."
          />
        )
      }
    />
  );
}

function EnrolledCourseCard({
  enrolled,
  catalog,
}: {
  enrolled: EnrolledCourse;
  catalog: CourseSummary[];
}) {
  const theme = useTheme();
  const { course, progress } = enrolled;
  const cover = coverForCourseSlug(course.slug);
  const followingCourse = progress.isComplete
    ? nextCourseAlongLearningPath(course, catalog)
    : undefined;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={[styles.cover, { backgroundColor: theme.colors.accentRamp[100] }]}>
        {cover ? (
          <Image
            source={cover}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.level, { color: theme.colors.accentRamp[700] }]}>
          {LEVEL_LABELS[course.level]}
          {progress.isComplete ? ' · terminado' : ''}
        </Text>

        <Text style={[styles.courseTitle, { color: theme.colors.text }]}>{course.title}</Text>

        {progress.isComplete ? (
          <Text style={[styles.closing, { color: theme.colors.neutral[700] }]}>
            {followingCourse
              ? `Este ya está. Sigue con ${followingCourse.title}.`
              : 'Terminaste la ruta. Puedes repasar o bajar el certificado en el curso.'}
          </Text>
        ) : (
          <>
            <ProgressBar
              percentage={progress.percentage}
              label={`${progress.completedLessons} de ${progress.totalLessons} lecciones`}
            />
            {progress.nextLesson ? (
              <Text style={[styles.next, { color: theme.colors.neutral[600] }]} numberOfLines={2}>
                Sigue: {progress.nextLesson.moduleTitle} · {progress.nextLesson.lessonTitle}
              </Text>
            ) : null}
          </>
        )}

        {progress.isComplete && followingCourse ? (
          <ActionLink
            href={`/catalog/${followingCourse.slug}`}
            label={`Sigue: ${followingCourse.title}`}
            kind="primary"
          />
        ) : null}

        <ActionLink
          href={
            progress.nextLesson
              ? `/catalog/${course.slug}/lessons/${progress.nextLesson.lessonId}`
              : `/catalog/${course.slug}`
          }
          label={progress.isComplete ? 'Abrir el curso' : callToAction(progress)}
          kind={progress.isComplete && followingCourse ? 'ghost' : 'primary'}
        />

        {progress.isComplete ? (
          <ActionLink href="/certificates" label="Ver certificados" kind="ghost" />
        ) : null}
      </View>
    </View>
  );
}

function ActionLink({
  href,
  label,
  kind,
}: {
  href: string;
  label: string;
  kind: 'primary' | 'ghost';
}) {
  const theme = useTheme();
  const isPrimary = kind === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <View
            style={[
              styles.button,
              {
                backgroundColor: isPrimary ? theme.colors.text : 'transparent',
                borderColor: isPrimary ? theme.colors.text : theme.colors.divider,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonLabel,
                { color: isPrimary ? '#ffffff' : theme.colors.text },
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
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
    gap: 16,
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
    overflow: 'hidden',
  },
  cover: {
    height: 168,
    position: 'relative',
  },
  cardBody: {
    padding: 20,
    gap: 10,
  },
  level: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  closing: {
    fontSize: 15,
    lineHeight: 22,
  },
  next: {
    fontSize: 13,
  },
  button: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
