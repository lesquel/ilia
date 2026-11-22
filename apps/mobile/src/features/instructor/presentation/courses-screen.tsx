import { Inbox, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { EmptyState, ErrorState } from '@/core/ui/state-view';
import { useSession } from '@/features/auth/application/use-auth';
import {
  useAuthoredCourses,
  useCourseInsights,
  useCreateCourse,
  useReviewInbox,
} from '@/features/instructor/application/use-instructor';
import { instructorGreeting, pickDashboardCourse } from '@/features/instructor/domain/dashboard';
import { slugify } from '@/features/instructor/domain/entities';
import { CoursesScreenSkeleton } from '@/features/instructor/presentation/courses-screen-skeleton';
import {
  CoursePicker,
  CourseTile,
  DropOffChart,
  KpiRow,
  ReviewQueueCard,
} from '@/features/instructor/presentation/dashboard-sections';
import {
  Card,
  Field,
  FieldLabel,
  OutlineLink,
} from '@/features/instructor/presentation/ui';

/**
 * The instructor's landing: how the class is going, what needs a look, and
 * their own courses — **drafts included**.
 *
 * Deliberately not the catalog listing: that one hides unpublished work, which
 * is exactly what an author needs to see. Every figure comes from what the
 * instructor endpoints already return: the course list, one course's
 * insights and that course's review inbox.
 */
export function InstructorCoursesScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const { courses, isLoading, error, refetch } = useAuthoredCourses();
  const create = useCreateCourse();

  const [chosenId, setChosenId] = useState<string | null>(null);
  const selected = pickDashboardCourse(courses, chosenId);
  const { insights } = useCourseInsights(selected?.id ?? '');
  const inbox = useReviewInbox(selected?.id);

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');

  const ready = title.trim().length > 0 && !create.isPending;

  const submit = () => {
    if (!ready) return;
    create.mutate(
      {
        title: title.trim(),
        slug: slugify(title),
        summary: summary.trim(),
        description: '',
        level: 'beginner',
      },
      {
        onSuccess: () => {
          setTitle('');
          setSummary('');
          setComposing(false);
        },
      },
    );
  };

  if (error) {
    const denied = error instanceof ApiError && error.status === 403;

    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        {denied ? (
          <EmptyState
            title="Esta sección es para instructores"
            hint="Si deberías tener acceso, pídele a un administrador que te cambie el rol."
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.ink, fontFamily: theme.typography.display.family },
            ]}
            accessibilityRole="header"
          >
            {instructorGreeting(user?.fullName)}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[800] }]}>
            {selected
              ? `Así va ${selected.title}.`
              : 'Tu aula: tus cursos, tus estudiantes y lo que espera corrección.'}
          </Text>
        </View>

        <View style={styles.titleActions}>
          <OutlineLink href="/instructor/submissions" glyph={Inbox} label="Ver entregas" />
          {composing ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setComposing(true)}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.colors.accentButton,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Icon glyph={Plus} size={16} color="#ffffff" />
              <Text style={styles.buttonLabel}>Nuevo curso</Text>
            </Pressable>
          )}
        </View>
      </View>

      {composing ? (
        <Card
          title="Nuevo curso"
          hint="Empieza por un borrador. No se publica hasta que tú lo digas."
        >
          <View>
            <FieldLabel>Título del curso</FieldLabel>
            <Field
              value={title}
              onChangeText={setTitle}
              placeholder="Título del curso"
              accessibilityLabel="Título del curso"
            />
            {/* The address is derived, not typed. An instructor should not have
                to think about URL-safe characters to publish a course. */}
            {title.trim() ? (
              <Text style={[styles.slugHint, { color: theme.colors.neutral[600] }]}>
                Dirección: /catalog/{slugify(title)}
              </Text>
            ) : null}

            <FieldLabel>Resumen</FieldLabel>
            <Field
              value={summary}
              onChangeText={setSummary}
              multiline
              textAlignVertical="top"
              placeholder="Resumen: es lo único que el docente lee en el catálogo antes de decidir."
              accessibilityLabel="Resumen del curso"
            />
          </View>

          {create.isError ? (
            <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]}>
              {create.error instanceof ApiError && create.error.code === 'slug_taken'
                ? 'Ya hay otro curso con esa dirección. Cambiá el título.'
                : 'No pudimos crear el curso.'}
            </Text>
          ) : null}

          <View style={styles.composerActions}>
            <Pressable onPress={() => setComposing(false)} accessibilityRole="button">
              <Text style={[styles.cancel, { color: theme.colors.neutral[600] }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!ready}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.colors.accentButton,
                  borderRadius: theme.radius.md,
                  opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {create.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonLabel}>Crear borrador</Text>
              )}
            </Pressable>
          </View>
        </Card>
      ) : null}

      {isLoading ? (
        <CoursesScreenSkeleton />
      ) : courses.length === 0 ? (
        <EmptyState
          title="Todavía no creaste ningún curso"
          hint="Empieza por un borrador. No se publica hasta que tú lo digas."
        />
      ) : (
        <>
          <CoursePicker
            courses={courses}
            selectedId={selected?.id}
            onSelect={setChosenId}
          />

          <KpiRow insights={insights} items={inbox.items} total={inbox.total} />

          <View style={styles.panels}>
            {insights && selected ? (
              <DropOffChart insights={insights} courseTitle={selected.title} />
            ) : null}
            <ReviewQueueCard items={inbox.items} />
          </View>

          <Text
            accessibilityRole="header"
            style={[
              styles.sectionTitle,
              { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
            ]}
          >
            Mis cursos
          </Text>
          <Text style={[styles.sectionHint, { color: theme.colors.neutral[800] }]}>
            Acá ves también los borradores, que el catálogo público no muestra.
          </Text>
          <View style={styles.tiles}>
            {courses.map((course) => (
              <CourseTile key={course.id} course={course} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    paddingBottom: 40,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 13.6,
  },
  titleText: { flexGrow: 1, flexShrink: 1, flexBasis: 280, gap: 3.4 },
  titleActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  slugHint: { fontSize: 12, marginTop: 6.8 },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20.4,
  },
  cancel: { fontSize: 15, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    gap: 6.8,
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  error: { fontSize: 14 },
  panels: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  sectionTitle: { fontSize: 22, letterSpacing: -0.3, marginTop: 8 },
  sectionHint: { fontSize: 14, lineHeight: 20, marginTop: -10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
