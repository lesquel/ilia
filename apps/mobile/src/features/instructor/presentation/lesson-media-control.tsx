import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import {
  useRemoveLessonMedia,
  useUploadLessonMedia,
} from '@/features/instructor/application/use-instructor';

/** Mirrors `ALLOWED_MEDIA_TYPES` on the API. Both sides state it, deliberately. */
const ACCEPTED = 'video/mp4,video/webm,audio/mpeg,audio/mp4,application/pdf';

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'unsupported_media_type':
        return 'Ese tipo de archivo no se admite. Subí un video MP4 o WebM, un audio o un PDF.';
      case 'unavailable':
        return 'El almacenamiento todavía no está configurado. Avisale a un administrador.';
      case 'foreign_media_reference':
      case 'lesson_not_found':
        return 'Esa lección no es de este curso.';
      default:
        return 'No pudimos subir el archivo.';
    }
  }

  if (error instanceof Error && error.message.startsWith('upload_failed')) {
    // The API said where to put it and the storage refused. Usually a link that
    // expired while a big file was still travelling on school Wi-Fi.
    return 'La subida no se completó. Probá de nuevo; si el archivo es grande, puede haber expirado el enlace.';
  }

  return 'No pudimos subir el archivo.';
}

/**
 * Attach or replace a lesson's media.
 *
 * Web only for now, and it says so rather than showing a button that does
 * nothing: picking a file on native needs a document picker, and shipping an
 * untested native path is worse than being honest about which one works.
 */
export function LessonMediaControl({
  courseId,
  lessonId,
  hasMedia,
}: {
  courseId: string;
  lessonId: string;
  hasMedia: boolean;
}) {
  const theme = useTheme();
  const upload = useUploadLessonMedia(courseId);
  const remove = useRemoveLessonMedia(courseId);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');

  if (Platform.OS !== 'web') {
    return (
      <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
        Subí el material desde la versión web.
      </Text>
    );
  }

  const busy = upload.isPending || remove.isPending;

  const pick = () => inputRef.current?.click();

  const onPicked = (event: { target: HTMLInputElement }) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    upload.mutate({ lessonId, file });
    // Cleared so picking the same file twice still fires a change event.
    event.target.value = '';
  };

  return (
    <View style={styles.row}>
      {/* React Native Web renders unknown elements as-is, which is what lets a
          real file input exist here. It stays hidden: the platform dialog is
          triggered from our own styled button. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onPicked}
        style={{ display: 'none' }}
      />

      <Pressable accessibilityRole="button" disabled={busy} onPress={pick}>
        <Text style={[styles.action, { color: theme.colors.accent, opacity: busy ? 0.5 : 1 }]}>
          {hasMedia ? 'Reemplazar material' : 'Subir material'}
        </Text>
      </Pressable>

      {hasMedia ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => remove.mutate(lessonId)}
        >
          <Text
            style={[styles.action, { color: theme.colors.neutral[600], opacity: busy ? 0.5 : 1 }]}
          >
            Quitar
          </Text>
        </Pressable>
      ) : null}

      {upload.isPending ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={[styles.note, { color: theme.colors.neutral[600] }]} numberOfLines={1}>
            Subiendo {fileName}…
          </Text>
        </View>
      ) : null}

      {upload.isSuccess ? (
        <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>Material subido.</Text>
      ) : null}

      {upload.isError || remove.isError ? (
        <Text
          style={[styles.note, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {messageFor(upload.error ?? remove.error)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10.2 },
  action: { fontSize: 12, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6.8, flexShrink: 1 },
  note: { fontSize: 12, flexShrink: 1 },
});
