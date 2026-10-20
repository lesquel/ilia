import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { LEVELS, LEVEL_LABELS, type Level } from '@/features/catalog/domain/entities';
import { useUpdateCourse } from '@/features/instructor/application/use-instructor';
import type { AuthoredCourse } from '@/features/instructor/domain/entities';
import {
  Field,
  FieldGroup,
  FieldLabel,
  OutlineButton,
  SubCard,
} from '@/features/instructor/presentation/ui';

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

  if (!open) {
    return (
      <OutlineButton glyph={Pencil} label="Editar los datos del curso" onPress={() => setOpen(true)} />
    );
  }

  return (
    <SubCard title="Datos del curso">
      <FieldGroup title="Nombre y dirección">
        <FieldLabel>Título</FieldLabel>
        <Field value={title} onChangeText={setTitle} accessibilityLabel="Título del curso" />

        <FieldLabel>Dirección</FieldLabel>
        <Field
          style={slugLocked ? styles.locked : undefined}
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
      </FieldGroup>

      <FieldGroup title="Lo que se lee en el catálogo">
        <FieldLabel>Resumen</FieldLabel>
        <Field
          style={styles.summary}
          value={summary}
          onChangeText={setSummary}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Resumen del curso"
        />

        <FieldLabel>Descripción</FieldLabel>
        <Field
          style={styles.textarea}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Descripción del curso"
        />
      </FieldGroup>

      <FieldGroup title="Nivel">
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
                    backgroundColor: selected ? theme.colors.accentButton : 'transparent',
                    borderColor: selected ? theme.colors.accent : theme.colors.divider,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    { color: selected ? '#ffffff' : theme.colors.neutral[800] },
                  ]}
                >
                  {LEVEL_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FieldGroup>

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
          <Text style={[styles.close, { color: theme.colors.neutral[600] }]}>Cerrar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accentButton,
              borderRadius: theme.radius.md,
              opacity: !canSave ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {update.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonLabel}>Guardar cambios</Text>
          )}
        </Pressable>
      </View>
    </SubCard>
  );
}

const styles = StyleSheet.create({
  locked: { opacity: 0.6 },
  // The summary is a sentence or two; the description is the long one.
  summary: { minHeight: 64 },
  textarea: { minHeight: 110 },
  hint: { fontSize: 12, marginTop: 6.8, lineHeight: 18 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8, marginTop: 6.8 },
  chip: { borderWidth: 1, paddingHorizontal: 13.6, paddingVertical: 6.8 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 14, marginTop: 6.8 },
  saved: { fontSize: 13, marginTop: 6.8 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20.4,
    marginTop: 13.6,
  },
  close: { fontSize: 14, fontWeight: '600' },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
