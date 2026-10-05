import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { formatDuration } from '@/features/catalog/domain/entities';
import {
  useAddLesson,
  useAddModule,
  useAuthoredCourseDetail,
  useAuthoredCourses,
  usePublishCourse,
  useUnpublishCourse,
} from '@/features/instructor/application/use-instructor';
import { CourseDetailsForm } from '@/features/instructor/presentation/course-details-form';
import { ActivityComposer } from '@/features/instructor/presentation/activity-composer';
import { LessonMediaControl } from '@/features/instructor/presentation/lesson-media-control';
import { STATUS_LABELS, canPublish } from '@/features/instructor/domain/entities';

export function CourseEditorScreen() {
  const theme = useTheme();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const id = courseId ?? '';

  const { courses, isLoading, error } = useAuthoredCourses();
  const course = courses.find((item) => item.id === id) ?? null;

  // The instructor's own endpoint, not the catalog's. The catalog answers 404
  // for a draft — which is exactly what is being edited here — so the syllabus
  // stayed empty no matter how much the instructor added.
  const { course: detail } = useAuthoredCourseDetail(id);

  const publish = usePublishCourse(id);
  const unpublish = useUnpublishCourse(id);
  const addModule = useAddModule(id);
  const addLesson = useAddLesson(id);

  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonFor, setLessonFor] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonBody, setLessonBody] = useState('');

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando el curso…" />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  const publishError = publish.error;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Link href="/instructor" style={[styles.link, { color: theme.colors.accent }]}>
        ← Mis cursos
      </Link>

      <Text style={[styles.status, { color: theme.colors.neutral[600] }]}>
        {STATUS_LABELS[course.status]}
      </Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        /catalog/{course.slug} · {course.lessonCount} lecciones ·{' '}
        {formatDuration(course.durationSeconds)}
      </Text>

      <View style={styles.actions}>
        {course.status === 'published' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => unpublish.mutate(undefined)}
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: theme.colors.divider, borderRadius: theme.radius.md, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>
              Retirar del catálogo
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!canPublish(course) || publish.isPending}
            onPress={() => publish.mutate(undefined)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radius.md,
                opacity: !canPublish(course) ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {publish.isPending ? (
              <ActivityIndicator color="#f2f2f3" />
            ) : (
              <Text style={styles.buttonLabel}>Publicar</Text>
            )}
          </Pressable>
        )}

        <Link
          href={`/instructor/courses/${course.id}/roster`}
          style={[styles.link, { color: theme.colors.accent }]}
        >
          Ver inscritos →
        </Link>
      </View>

      <CourseDetailsForm course={course} />

      {/* Every blocker, not just the first. An instructor told "cannot publish"
          one reason at a time will fix them one round trip at a time. */}
      {course.publishBlockers.length > 0 ? (
        <View
          style={[
            styles.panel,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>
            Falta para poder publicar
          </Text>
          {course.publishBlockers.map((blocker) => (
            <Text key={blocker} style={[styles.blocker, { color: theme.colors.neutral[700] }]}>
              • {blocker}
            </Text>
          ))}
        </View>
      ) : null}

      {publishError ? (
        <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]}>
          {publishError instanceof ApiError && publishError.code === 'course_not_ready'
            ? 'El curso todavía no está listo. Mira la lista de arriba.'
            : 'No pudimos publicar el curso.'}
        </Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Temario</Text>

      {(detail?.modules ?? []).map((module) => (
        <View
          key={module.id}
          style={[
            styles.module,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
            {module.position}. {module.title}
          </Text>

          {module.lessons.length === 0 ? (
            <Text style={[styles.blocker, { color: theme.colors.neutral[600] }]}>
              Este módulo está vacío. Un módulo sin lecciones bloquea la publicación.
            </Text>
          ) : (
            module.lessons.map((lesson) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <Text style={[styles.lesson, { color: theme.colors.neutral[700] }]}>
                  • {lesson.title} · {formatDuration(lesson.durationSeconds)}
                  {lesson.hasMedia ? ' · con material' : ''}
                </Text>
                <LessonMediaControl
                  courseId={course.id}
                  lessonId={lesson.id}
                  hasMedia={lesson.hasMedia}
                />
              </View>
            ))
          )}

          {/* The activity is what the course is for; the lessons lead up to
              it. Offered on every module, right where the lessons are. */}
          <ActivityComposer courseId={course.id} moduleId={module.id} />

          {lessonFor === module.id ? (
            <View style={styles.composer}>
              <TextInput
                value={lessonTitle}
                onChangeText={setLessonTitle}
                placeholder="Título de la lección"
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Título de la lección"
                style={[
                  styles.input,
                  { borderColor: theme.colors.divider, color: theme.colors.text },
                ]}
              />
              <TextInput
                value={lessonBody}
                onChangeText={setLessonBody}
                multiline
                textAlignVertical="top"
                placeholder="Contenido de la lección"
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Contenido de la lección"
                style={[
                  styles.input,
                  styles.textarea,
                  { borderColor: theme.colors.divider, color: theme.colors.text },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!lessonTitle.trim() || addLesson.isPending}
                onPress={() =>
                  addLesson.mutate(
                    {
                      moduleId: module.id,
                      input: {
                        title: lessonTitle.trim(),
                        kind: 'text',
                        durationSeconds: 300,
                        body: lessonBody.trim(),
                      },
                    },
                    {
                      onSuccess: () => {
                        setLessonTitle('');
                        setLessonBody('');
                        setLessonFor(null);
                      },
                    },
                  )
                }
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radius.md,
                    opacity: !lessonTitle.trim() ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.buttonLabel}>Agregar lección</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setLessonFor(module.id)} accessibilityRole="button">
              <Text style={[styles.link, { color: theme.colors.accent }]}>+ Lección</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.composer}>
        <TextInput
          value={moduleTitle}
          onChangeText={setModuleTitle}
          placeholder="Título del nuevo módulo"
          placeholderTextColor={theme.colors.neutral[500]}
          accessibilityLabel="Título del nuevo módulo"
          style={[styles.input, { borderColor: theme.colors.divider, color: theme.colors.text }]}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!moduleTitle.trim() || addModule.isPending}
          onPress={() =>
            addModule.mutate(moduleTitle.trim(), { onSuccess: () => setModuleTitle('') })
          }
          style={({ pressed }) => [
            styles.secondary,
            {
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.md,
              opacity: !moduleTitle.trim() ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>
            + Agregar módulo
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20.4,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  link: { fontSize: 15, fontWeight: '600' },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6.8,
  },
  title: { fontSize: 30, fontWeight: '600' },
  meta: { fontSize: 13 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20.4,
    marginVertical: 10.2,
    flexWrap: 'wrap',
  },
  panel: { borderWidth: 1, padding: 13.6, gap: 3.4 },
  panelTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3.4 },
  blocker: { fontSize: 14, lineHeight: 21 },
  error: { fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 13.6 },
  module: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  moduleTitle: { fontSize: 16, fontWeight: '600' },
  lessonRow: { gap: 3.4, marginBottom: 6.8 },
  lesson: { fontSize: 14 },
  composer: { gap: 6.8, marginTop: 6.8 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 10.2, fontSize: 15 },
  textarea: { minHeight: 90 },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryLabel: { fontSize: 15, fontWeight: '600' },
});
