import { Link } from 'expo-router';
import { BookOpen, Clock, Inbox, Layers, Plus, Signal } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { LEVEL_LABELS, formatDuration } from '@/features/catalog/domain/entities';
import {
  useAuthoredCourses,
  useCreateCourse,
} from '@/features/instructor/application/use-instructor';
import { slugify, type AuthoredCourse } from '@/features/instructor/domain/entities';
import {
  Card,
  Fact,
  Field,
  FieldLabel,
  OutlineLink,
  StatusTag,
  cardLift,
} from '@/features/instructor/presentation/ui';

/**
 * The instructor's own courses — **drafts included**.
 *
 * Deliberately not the catalog listing: that one hides unpublished work, which
 * is exactly what an author needs to see.
 */
export function InstructorCoursesScreen() {
  const theme = useTheme();
  const { courses, isLoading, error, refetch } = useAuthoredCourses();
  const create = useCreateCourse();

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
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={courses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CourseRow course={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">Mis cursos</Text>
              <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
                Acá ves también los borradores, que el catálogo público no muestra.
              </Text>
            </View>

            <View style={styles.titleActions}>
              <OutlineLink
                href="/instructor/submissions"
                glyph={Inbox}
                label="Ver entregas para revisar"
              />
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
                  <Text style={[styles.cancel, { color: theme.colors.neutral[600] }]}>
                    Cancelar
                  </Text>
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
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando tus cursos…" />
        ) : (
          <EmptyState
            title="Todavía no creaste ningún curso"
            hint="Empieza por un borrador. No se publica hasta que tú lo digas."
          />
        )
      }
    />
  );
}

function CourseRow({ course }: { course: AuthoredCourse }) {
  const theme = useTheme();
  const [blocker] = course.publishBlockers;

  return (
    <Link href={`/instructor/courses/${course.id}`} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
          // The look lives on this View, never on the Pressable: with `asChild`
          // the Pressable is the anchor on web and drops its own style.
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: hovered ? theme.colors.accentRamp[300] : theme.colors.divider,
                borderRadius: theme.radius.lg,
                opacity: pressed ? 0.92 : 1,
                ...cardLift(Boolean(hovered)),
              },
            ]}
          >
            <StatusTag status={course.status} />

            <Text style={[styles.courseTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {course.title}
            </Text>

            <View style={styles.facts}>
              <Fact glyph={Signal} label={LEVEL_LABELS[course.level]} />
              <Fact
                glyph={Layers}
                label={`${course.moduleCount} ${course.moduleCount === 1 ? 'módulo' : 'módulos'}`}
              />
              <Fact
                glyph={BookOpen}
                label={`${course.lessonCount} ${course.lessonCount === 1 ? 'lección' : 'lecciones'}`}
              />
              <Fact glyph={Clock} label={formatDuration(course.durationSeconds)} />
            </View>

            {/* Shown even on a published course: an instructor who breaks one
                should find out now, not the next time they try to publish. */}
            {blocker ? (
              <Text style={[styles.blocker, { color: theme.colors.neutral[600] }]}>
                Falta para publicar: {blocker}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
  },
  header: { gap: 20.4, marginBottom: 6.8 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 13.6,
  },
  titleText: { flexGrow: 1, flexShrink: 1, flexBasis: 280, gap: 3.4 },
  titleActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  title: { fontSize: 32, fontWeight: '600' },
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
  card: { borderWidth: 1, padding: 20.4, gap: 10.2 },
  courseTitle: { fontSize: 20, fontWeight: '700', lineHeight: 26, letterSpacing: -0.2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 13.6, rowGap: 6.8 },
  blocker: { fontSize: 13, lineHeight: 19 },
});
