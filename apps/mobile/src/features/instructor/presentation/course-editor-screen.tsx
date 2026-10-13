import { Link, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BarChart3, BookOpen, Clock, Layers, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
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
import { canPublish } from '@/features/instructor/domain/entities';
import { ActivityComposer } from '@/features/instructor/presentation/activity-composer';
import { CourseDetailsForm } from '@/features/instructor/presentation/course-details-form';
import { LessonMediaControl } from '@/features/instructor/presentation/lesson-media-control';
import {
  Card,
  Fact,
  Field,
  FieldLabel,
  OutlineButton,
  OutlineLink,
  StatusTag,
  SubCard,
} from '@/features/instructor/presentation/ui';

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
  const modules = detail?.modules ?? [];
  const muted = theme.colors.neutral[600];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Link href="/instructor" asChild>
        <Pressable accessibilityRole="link" style={styles.backLink}>
          <Icon glyph={ArrowLeft} size={16} color={muted} />
          <Text style={[styles.backLabel, { color: muted }]}>Mis cursos</Text>
        </Pressable>
      </Link>

      <Card>
        <StatusTag status={course.status} />
        <View style={styles.headText}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
          <Text selectable style={[styles.meta, { color: muted }]}>
            /catalog/{course.slug}
          </Text>
        </View>
        <View style={styles.facts}>
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

        <View style={styles.actions}>
          {course.status === 'published' ? (
            <OutlineButton label="Retirar del catálogo" onPress={() => unpublish.mutate(undefined)} />
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

          <OutlineLink
            href={`/instructor/courses/${course.id}/roster`}
            glyph={BarChart3}
            label="Estadísticas e inscritos"
          />
        </View>

        <CourseDetailsForm course={course} />
      </Card>

      {/* Every blocker, not just the first. An instructor told "cannot publish"
          one reason at a time will fix them one round trip at a time. */}
      {course.publishBlockers.length > 0 ? (
        <Card title="Falta para poder publicar">
          <View style={styles.checklist}>
            {course.publishBlockers.map((blocker) => (
              <View key={blocker} style={styles.checkItem}>
                <View style={[styles.checkMark, { borderColor: theme.colors.neutral[400] }]} />
                <Text style={[styles.checkText, { color: theme.colors.text }]}>{blocker}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {publishError ? (
        <Text
          style={[styles.error, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {publishError instanceof ApiError && publishError.code === 'course_not_ready'
            ? 'El curso todavía no está listo. Mira la lista de arriba.'
            : 'No pudimos publicar el curso.'}
        </Text>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Temario</Text>
        {modules.length > 0 ? (
          <Text style={[styles.meta, { color: muted }]}>
            {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
          </Text>
        ) : null}
      </View>

      {modules.map((module) => (
        <Card key={module.id}>
          <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
            {module.position} · {module.title}
          </Text>

          {module.lessons.length === 0 ? (
            <Text style={[styles.empty, { color: muted }]}>
              Este módulo está vacío. Un módulo sin lecciones bloquea la publicación.
            </Text>
          ) : null}

          {module.lessons.length + module.activities.length > 0 ? (
            <View>
              {module.lessons.map((lesson, index) => (
                <View
                  key={lesson.id}
                  style={[
                    styles.item,
                    { borderTopColor: index === 0 ? 'transparent' : theme.colors.divider },
                  ]}
                >
                  <View style={styles.itemLine}>
                    <Text style={[styles.itemIndex, { color: theme.colors.neutral[500] }]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                      {lesson.title}
                    </Text>
                    <Text style={[styles.itemTrailing, { color: muted }]}>
                      {formatDuration(lesson.durationSeconds)}
                      {lesson.hasMedia ? ' · con material' : ''}
                    </Text>
                  </View>
                  <View style={styles.itemExtra}>
                    <LessonMediaControl
                      courseId={course.id}
                      lessonId={lesson.id}
                      hasMedia={lesson.hasMedia}
                    />
                  </View>
                </View>
              ))}

              {module.activities.map((activity, index) => (
                <View
                  key={activity.id}
                  style={[
                    styles.item,
                    {
                      borderTopColor:
                        module.lessons.length + index === 0
                          ? 'transparent'
                          : theme.colors.divider,
                    },
                  ]}
                >
                  <View style={styles.itemLine}>
                    <Text style={[styles.itemIndex, { color: theme.colors.neutral[500] }]}>
                      {String(module.lessons.length + index + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                      {activity.title}
                    </Text>
                    <View
                      style={[styles.practiceTag, { backgroundColor: theme.colors.accentRamp[100] }]}
                    >
                      <Text style={[styles.practiceLabel, { color: theme.colors.accentRamp[800] }]}>
                        práctica
                      </Text>
                    </View>
                    <Text style={[styles.itemTrailing, { color: muted }]}>
                      {activity.maxAttempts} {activity.maxAttempts === 1 ? 'intento' : 'intentos'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.moduleForms}>
            {lessonFor === module.id ? (
              <SubCard title="Nueva lección">
                <View>
                  <FieldLabel>Título de la lección</FieldLabel>
                  <Field
                    value={lessonTitle}
                    onChangeText={setLessonTitle}
                    placeholder="Título de la lección"
                    accessibilityLabel="Título de la lección"
                  />
                  <FieldLabel>Contenido de la lección</FieldLabel>
                  <Field
                    value={lessonBody}
                    onChangeText={setLessonBody}
                    multiline
                    textAlignVertical="top"
                    placeholder="Contenido de la lección"
                    accessibilityLabel="Contenido de la lección"
                  />
                </View>
                <View style={styles.formActions}>
                  <Pressable accessibilityRole="button" onPress={() => setLessonFor(null)}>
                    <Text style={[styles.cancel, { color: muted }]}>Cancelar</Text>
                  </Pressable>
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
              </SubCard>
            ) : (
              <OutlineButton
                glyph={Plus}
                label="Agregar lección"
                onPress={() => setLessonFor(module.id)}
              />
            )}

            {/* The activity is what the course is for; the lessons lead up to
                it. Offered on every module, right where the lessons are. */}
            <ActivityComposer courseId={course.id} moduleId={module.id} />
          </View>
        </Card>
      ))}

      <Card
        title="Nuevo módulo"
        hint={
          modules.length === 0
            ? 'El temario se arma por módulos. Empieza por el primero.'
            : undefined
        }
      >
        <Field
          value={moduleTitle}
          onChangeText={setModuleTitle}
          placeholder="Título del nuevo módulo"
          accessibilityLabel="Título del nuevo módulo"
        />
        <OutlineButton
          glyph={Plus}
          label="Agregar módulo"
          disabled={!moduleTitle.trim() || addModule.isPending}
          onPress={() =>
            addModule.mutate(moduleTitle.trim(), { onSuccess: () => setModuleTitle('') })
          }
        />
      </Card>
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
    gap: 13.6,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
  },
  backLabel: { fontSize: 14, fontWeight: '600' },
  headText: { gap: 3.4 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  meta: { fontSize: 13 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 13.6, rowGap: 6.8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10.2, flexWrap: 'wrap' },
  checklist: { gap: 10.2 },
  checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10.2 },
  // An empty box, not a bullet: each line is something still to be done.
  checkMark: { width: 12, height: 12, borderWidth: 2, marginTop: 4 },
  checkText: { flex: 1, fontSize: 14, lineHeight: 21 },
  error: { fontSize: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6.8,
    marginTop: 13.6,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  moduleTitle: { fontSize: 17, fontWeight: '700' },
  empty: { fontSize: 14, lineHeight: 21 },
  item: { paddingVertical: 10.2, borderTopWidth: 1, gap: 6.8 },
  itemLine: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  itemIndex: { width: 22, fontSize: 12, fontWeight: '700' },
  itemTitle: { flex: 1, fontSize: 14 },
  itemTrailing: { fontSize: 12 },
  // Lined up under the title, past the index column.
  itemExtra: { paddingLeft: 32.2 },
  practiceTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  practiceLabel: { fontSize: 11, fontWeight: '700' },
  moduleForms: { gap: 10.2 },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20.4,
    marginTop: 6.8,
  },
  cancel: { fontSize: 14, fontWeight: '600' },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
});
