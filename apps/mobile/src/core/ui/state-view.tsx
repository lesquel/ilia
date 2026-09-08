import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';

/**
 * Loading, empty and error states.
 *
 * The mockup has none of these — every screen is drawn with data already there.
 * They are not decoration: a teacher on school Wi-Fi will meet all three, and a
 * blank screen with no explanation is indistinguishable from a broken app.
 */

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={[styles.body, { color: theme.colors.neutral[600] }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.body, { color: theme.colors.neutral[600] }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Wording chosen from the backend's stable error code, never from its message. */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado.';
  }

  switch (error.code) {
    case 'network_error':
      return 'No pudimos conectarnos. Revisá tu conexión.';
    case 'unavailable':
      return 'El servicio no está disponible ahora mismo. Probá en unos minutos.';
    case 'not_found':
    case 'course_not_found':
      return 'No encontramos lo que buscabas.';
    default:
      return 'No pudimos cargar esta información.';
  }
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useTheme();
  // Retrying a 404 or a 403 would fail identically forever, so the button only
  // appears when trying again can actually change the outcome.
  const canRetry = Boolean(onRetry) && (!(error instanceof ApiError) || error.isRetryable);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{messageFor(error)}</Text>

      {canRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.retry,
            {
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    gap: 10.2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
  },
  retry: {
    marginTop: 6.8,
    borderWidth: 1,
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
  },
});
