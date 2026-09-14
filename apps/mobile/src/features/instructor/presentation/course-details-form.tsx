import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { LEVELS, LEVEL_LABELS, type Level } from '@/features/catalog/domain/entities';
import { useUpdateCourse } from '@/features/instructor/application/use-instructor';
import type { AuthoredCourse } from '@/features/instructor/domain/entities';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos guardar los cambios.';

  switch (error.code) {
    case 'slug_taken':
      return 'Ya hay otro curso con esa dirección. Elegí otra.';
    case 'published_slug_change':
      return 'No se puede cambiar la dirección de un curso publicado. Retíralo del catálogo primero.';
    case 'invalid_slug':
      return 'La dirección sólo admite minúsculas sin acentos, números y guiones.';
    case 'validation_error':
      return 'Revisa los campos: el título y el resumen no pueden quedar vacíos.';
    default:
      return 'No pudimos guardar los cambios.';
  }
}

/**
 * Edit the course's own details, as opposed to its syllabus.
 *
 * Until this existed an instructor could create a course and then never fix a
 * typo in its title — `useUpdateCourse` was written and wired to nothing.
 */
export function CourseDetailsForm({ course }: { course: AuthoredCourse }) {
  const theme = useTheme();
  const update = useUpdateCourse(course.id);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [summary, setSummary] = useState(course.summary);
  const [description, setDescription] = useState(course.description);
  const [level, setLevel] = useState<Level>(course.level);

  // Once the course is out there, its address is in students' bookmarks and in
  // whatever the instructor pasted into a staff group. The API refuses the
  // change too — this only saves the round trip and explains it in place.
  const slugLocked = course.status === 'published';

  const dirty =
    title !== course.title ||
    slug !== course.slug ||
    summary !== course.summary ||
    description !== course.description ||
    level !== course.level;

  const valid = title.trim().length > 0 && slug.trim().length > 0 && summary.trim().length > 0;
  const canSave = dirty && valid && !update.isPending;

  const save = () => {
    if (!canSave) return;
    update.mutate({
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      description: description.trim(),
      level,
    });
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.neutral[100],
      borderColor: theme.colors.divider,
      color: theme.colors.text,
      borderRadius: theme.radius.sm,
    },
  ];

  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text style={[styles.toggle, { color: theme.colors.accent }]}>Editar los datos del curso</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.panel, { borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}
    >
      <Text style={[styles.panelTitle, { color: theme.colors.text }]}>Datos del curso</Text>

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Título</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        accessibilityLabel="Título del curso"
      />

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Dirección</Text>
      <TextInput
        style={[...inputStyle, slugLocked ? { opacity: 0.6 } : null]}
        value={slug}
        onChangeText={setSlug}
        editable={!slugLocked}
        autoCapitalize="none"
        accessibilityLabel="Dirección del curso"
      />
      <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
        {slugLocked
          ? 'No se puede cambiar mientras el curso esté publicado: los enlaces que ya tienen tus estudiantes dejarían de funcionar. Retíralo del catálogo si necesitas cambiarla.'
          : `Va a quedar como /catalog/${slug || 'direccion-del-curso'}`}
      </Text>

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Resumen</Text>
      <TextInput
        style={inputStyle}
        value={summary}
        onChangeText={setSummary}
        multiline
        textAlignVertical="top"
        accessibilityLabel="Resumen del curso"
      />

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Descripción</Text>
      <TextInput
        style={[...inputStyle, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        accessibilityLabel="Descripción del curso"
      />

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Nivel</Text>
      <View style={styles.levels}>
        {LEVELS.map((option) => {
          const selected = option === level;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setLevel(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.colors.accent : 'transparent',
                  borderColor: selected ? theme.colors.accent : theme.colors.divider,
                  borderRadius: theme.radius.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: selected ? '#f2f2f3' : theme.colors.neutral[700] },
                ]}
              >
                {LEVEL_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {update.isError ? (
        <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]} accessibilityRole="alert">
          {messageFor(update.error)}
        </Text>
      ) : null}

      {update.isSuccess && !dirty ? (
        <Text style={[styles.saved, { color: theme.colors.neutral[600] }]}>Cambios guardados.</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
          <Text style={[styles.toggle, { color: theme.colors.neutral[600] }]}>Cerrar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: !canSave ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {update.isPending ? (
            <ActivityIndicator color="#f2f2f3" />
          ) : (
            <Text style={styles.buttonLabel}>Guardar cambios</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, padding: 13.6, gap: 3.4, marginTop: 13.6 },
  panelTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6.8 },
  label: { fontSize: 13, marginTop: 6.8, marginBottom: 3.4 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 10.2, fontSize: 15 },
  textarea: { minHeight: 100 },
  hint: { fontSize: 12, marginTop: 3.4, lineHeight: 18 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8, marginTop: 3.4 },
  chip: { borderWidth: 1, paddingHorizontal: 13.6, paddingVertical: 6.8 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 14, marginTop: 6.8 },
  saved: { fontSize: 13, marginTop: 6.8 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 13.6,
    marginTop: 13.6,
  },
  toggle: { fontSize: 14, fontWeight: '600', marginTop: 13.6 },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
});
