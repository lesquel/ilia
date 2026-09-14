import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { LEVEL_LABELS, formatDuration } from '@/features/catalog/domain/entities';
import {
  useAuthoredCourses,
  useCreateCourse,
} from '@/features/instructor/application/use-instructor';
import {
  STATUS_LABELS,
  slugify,
  type AuthoredCourse,
} from '@/features/instructor/domain/entities';

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
          <Text style={[styles.title, { color: theme.colors.text }]}>Mis cursos</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Acá ves también los borradores, que el catálogo público no muestra.
          </Text>

          <Link
            href="/instructor/submissions"
            style={[styles.link, { color: theme.colors.accent }]}
          >
            Ver entregas para revisar →
          </Link>

          {composing ? (
            <View
              style={[
                styles.composer,
                {
                  backgroundColor: theme.colors.neutral[100],
                  borderColor: theme.colors.divider,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Título del curso"
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Título del curso"
                style={[
                  styles.input,
                  { borderColor: theme.colors.divider, color: theme.colors.text },
                ]}
              />
              {/* The address is derived, not typed. An instructor should not have
                  to think about URL-safe characters to publish a course. */}
              {title.trim() ? (
                <Text style={[styles.slugHint, { color: theme.colors.neutral[600] }]}>
                  Dirección: /catalog/{slugify(title)}
                </Text>
              ) : null}
              <TextInput
                value={summary}
                onChangeText={setSummary}
                multiline
                textAlignVertical="top"
                placeholder="Resumen: es lo único que el docente lee en el catálogo antes de decidir."
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Resumen del curso"
                style={[
                  styles.input,
                  styles.textarea,
                  { borderColor: theme.colors.divider, color: theme.colors.text },
                ]}
              />

              {create.isError ? (
                <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]}>
                  {create.error instanceof ApiError && create.error.code === 'slug_taken'
                    ? 'Ya hay otro curso con esa dirección. Cambiá el título.'
                    : 'No pudimos crear el curso.'}
                </Text>
              ) : null}

              <View style={styles.composerActions}>
                <Pressable onPress={() => setComposing(false)} accessibilityRole="button">
                  <Text style={[styles.link, { color: theme.colors.neutral[600] }]}>
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
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radius.md,
                      opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {create.isPending ? (
                    <ActivityIndicator color="#f2f2f3" />
                  ) : (
                    <Text style={styles.buttonLabel}>Crear borrador</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setComposing(true)}
              style={({ pressed }) => [
                styles.button,
                styles.newButton,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.buttonLabel}>+ Nuevo curso</Text>
            </Pressable>
          )}
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
  const published = course.status === 'published';

  return (
    <Link href={`/instructor/courses/${course.id}`} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.neutral[100],
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.status,
                {
                  color: published
                    ? theme.colors.accentRamp[700]
                    : theme.colors.neutral[600],
                },
              ]}
            >
              {STATUS_LABELS[course.status]} · {LEVEL_LABELS[course.level]}
            </Text>

            <Text style={[styles.courseTitle, { color: theme.colors.text }]}>
              {course.title}
            </Text>

            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
              {course.moduleCount} módulos · {course.lessonCount} lecciones ·{' '}
              {formatDuration(course.durationSeconds)}
            </Text>

            {/* Shown even on a published course: an instructor who breaks one
                should find out now, not the next time they try to publish. */}
            {course.publishBlockers.length > 0 ? (
              <Text style={[styles.blocker, { color: theme.colors.neutral[700] }]}>
                Falta para publicar: {course.publishBlockers[0]}
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
  header: { gap: 6.8, marginBottom: 6.8 },
  title: { fontSize: 32, fontWeight: '600' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, fontWeight: '600', marginVertical: 6.8 },
  composer: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 10.2, fontSize: 15 },
  textarea: { minHeight: 90 },
  slugHint: { fontSize: 12 },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 13.6,
  },
  newButton: { alignSelf: 'flex-start' },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
  error: { fontSize: 14 },
  card: { borderWidth: 1, padding: 20.4, gap: 3.4 },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  courseTitle: { fontSize: 20, fontWeight: '600' },
  meta: { fontSize: 13 },
  blocker: { fontSize: 13, marginTop: 3.4 },
});
