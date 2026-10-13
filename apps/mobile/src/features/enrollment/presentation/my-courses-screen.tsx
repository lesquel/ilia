import type { Href } from 'expo-router';
import { ArrowRight, GraduationCap, History, UserRound } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  Card,
  Fact,
  OutlineLink,
  PrimaryLink,
  ScreenHeader,
  SectionHeading,
  Tag,
} from '@/core/ui/surface';
import {
  LEVEL_LABELS,
  isSyllabusFinished,
  nextCourseAlongLearningPath,
  nextOpenSyllabusItem,
  type CourseSummary,
} from '@/features/catalog/domain/entities';
import { useCourse, useCourses } from '@/features/catalog';
import { useSession } from '@/features/auth';
import { useMyCourses } from '@/features/enrollment/application/use-enrollment';
import {
  callToAction,
  enrolmentsBesides,
  type EnrolledCourse,
} from '@/features/enrollment/domain/entities';
import { primaryCourseToContinue } from '@/features/enrollment/domain/resume';
import { ContinueHero } from '@/features/enrollment/presentation/continue-hero';

const CONTENT_MAX_WIDTH = 1080;
const CONTENT_PADDING = 20.4;
const GRID_GAP = 13.6;

export function MyCoursesScreen() {
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { courses, isLoading, error, refetch } = useMyCourses();
  const { courses: catalog } = useCourses();

  if (isCheckingSession) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        <EmptyState
          glyph={GraduationCap}
          title="Inicia sesión para ver tus cursos"
          hint="Tu progreso queda guardado en tu cuenta."
          action={{ label: 'Iniciar sesión', href: '/login?next=/my-courses' as Href }}
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const hasOnlyFinishedCourses =
    courses.length > 0 && courses.every((item) => item.progress.isFinished);
  const featured = primaryCourseToContinue(courses);
  const others = enrolmentsBesides(courses, featured);

  // Same breakpoints as the catalogue grid, and the same cap: a card takes one
  // column's width even when it is alone on its row.
  const columns = width >= breakpoint.medium ? 3 : width >= breakpoint.compact ? 2 : 1;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - CONTENT_PADDING * 2;
  const cardWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  return (
    <Screen>
      <ScreenHeader
        title="Mis cursos"
        subtitle={
          hasOnlyFinishedCourses
            ? 'Ya terminaste lo que tenías abierto. Sigue por la ruta.'
            : 'Continúa aprendiendo donde lo dejaste.'
        }
        actions={<OutlineLink href="/evaluations" label="Historial de entregas" glyph={History} />}
      />

      {isLoading ? (
        <LoadingState label="Cargando tus cursos…" />
      ) : courses.length === 0 ? (
        <EmptyState
          glyph={GraduationCap}
          title="Todavía no te inscribiste en ningún curso"
          hint="Explora el catálogo y empieza por la ruta básica."
          action={{ label: 'Explorar cursos', href: '/catalog' }}
        />
      ) : (
        <>
          {featured ? <ContinueHero enrolled={featured} /> : null}

          {others.length > 0 ? (
            <View style={styles.section}>
              <SectionHeading title={featured ? 'Tus otros cursos' : 'Tus cursos'} />
              <View style={columns > 1 ? styles.grid : styles.stack}>
                {others.map((item) => (
                  <View key={item.course.id} style={columns > 1 ? { width: cardWidth } : undefined}>
                    <EnrolledCourseCard enrolled={item} catalog={catalog} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
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
  // Same rule as the course page: lessons done is not enough while a practice
  // is pending. Until the syllabus loads, a lessons-complete course is not
  // announced as finished.
  const { course: detail } = useCourse(course.slug);
  const isFinished =
    progress.isComplete &&
    detail !== null &&
    detail !== undefined &&
    isSyllabusFinished(detail.modules, progress.completedLessonIds, progress.passedActivityIds);
  const pendingPractice =
    progress.isComplete && !isFinished && detail
      ? nextOpenSyllabusItem(detail.modules, progress.completedLessonIds, progress.passedActivityIds)
      : undefined;
  const followingCourse = isFinished
    ? nextCourseAlongLearningPath(course, catalog)
    : undefined;

  const courseHref = (
    pendingPractice
      ? `/lab/${pendingPractice.id}`
      : progress.nextLesson
        ? `/catalog/${course.slug}/lessons/${progress.nextLesson.lessonId}`
        : `/catalog/${course.slug}`
  ) as Href;
  const courseLabel = isFinished
    ? 'Abrir el curso'
    : pendingPractice
      ? 'Hacer la práctica'
      : callToAction(progress);
  // One filled button per card: once the course is finished, the next course
  // on the route is the action and opening this one steps back.
  const nextCourseIsTheAction = isFinished && followingCourse !== undefined;

  return (
    <Card style={styles.card}>
      <View style={styles.tags}>
        <Tag label={LEVEL_LABELS[course.level]} tone="accent" />
        {isFinished ? <Tag label="Terminado" filled /> : null}
      </View>

      <View style={styles.cardHead}>
        <Text style={[styles.courseTitle, { color: theme.colors.text }]} numberOfLines={3}>
          {course.title}
        </Text>
        {course.instructorName.trim() ? (
          <Fact glyph={UserRound} label={course.instructorName} />
        ) : null}
      </View>

      <ProgressBar
        percentage={progress.percentage}
        label={`${progress.completedLessons} de ${progress.totalLessons} lecciones · ${Math.round(progress.percentage)}%`}
      />

      {/* Fills the card, so the actions line up along a row of cards whose
          notes run to different lengths. */}
      <View style={styles.next}>
        {isFinished ? (
          <Text style={[styles.note, { color: theme.colors.neutral[800] }]}>
            {followingCourse
              ? `Este ya está. Sigue con ${followingCourse.title}.`
              : 'Terminaste la ruta. Puedes repasar o emitir el certificado en el curso.'}
          </Text>
        ) : pendingPractice ? (
          <Text style={[styles.note, { color: theme.colors.neutral[800] }]} numberOfLines={3}>
            Lecciones listas · falta la práctica: {pendingPractice.title}
          </Text>
        ) : progress.nextLesson ? (
          <Text style={[styles.note, { color: theme.colors.neutral[800] }]} numberOfLines={3}>
            Sigue: {progress.nextLesson.moduleTitle} · {progress.nextLesson.lessonTitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {nextCourseIsTheAction ? (
          <PrimaryLink
            href={`/catalog/${followingCourse.slug}` as Href}
            label={`Sigue: ${followingCourse.title}`}
            glyph={ArrowRight}
          />
        ) : (
          <PrimaryLink href={courseHref} label={courseLabel} glyph={ArrowRight} />
        )}
        {nextCourseIsTheAction ? <OutlineLink href={courseHref} label={courseLabel} /> : null}
        {isFinished ? <OutlineLink href="/certificates" label="Ver certificados" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: CONTENT_PADDING,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  section: { gap: 13.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: GRID_GAP },
  stack: { gap: GRID_GAP },
  card: { flexGrow: 1, gap: 10.2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  cardHead: { gap: 3.4 },
  courseTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24, letterSpacing: -0.2 },
  next: { flexGrow: 1 },
  note: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
});
