import type { Href } from 'expo-router';
import { CircleAlert, RefreshCw, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { OutlineButton, PrimaryButton, PrimaryLink } from '@/core/ui/surface';

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

/** Where an empty state can send the person, so it is not a dead end. */
export type StateAction =
  | { label: string; href: Href }
  | { label: string; onPress: () => void };

function Glyph({ glyph }: { glyph: LucideIcon }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.glyph,
        { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.md },
      ]}
    >
      <Icon glyph={glyph} size={22} color={theme.colors.accent} />
    </View>
  );
}

/**
 * A framed note standing where the content would be.
 *
 * The frame has no shadow on purpose: several callers already sit inside a
 * card, and a lifted card inside a card reads as two things.
 */
function Frame({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        styles.frame,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function EmptyState({
  title,
  hint,
  glyph,
  action,
}: {
  title: string;
  hint?: string;
  glyph?: LucideIcon;
  action?: StateAction;
}) {
  const theme = useTheme();

  return (
    <Frame>
      {glyph ? <Glyph glyph={glyph} /> : null}
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.body, { color: theme.colors.neutral[600] }]}>{hint}</Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          {'href' in action ? (
            <PrimaryLink label={action.label} href={action.href} />
          ) : (
            <PrimaryButton label={action.label} onPress={action.onPress} />
          )}
        </View>
      ) : null}
    </Frame>
  );
}

/** Wording chosen from the backend's stable error code, never from its message. */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado.';
  }

  switch (error.code) {
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión.';
    case 'unavailable':
      return 'El servicio no está disponible ahora mismo. Prueba en unos minutos.';
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
    // Unframed: an error replaces a whole screen as often as a list, and the
    // screens that show it do not all leave room around a border.
    <View style={styles.container}>
      <Glyph glyph={CircleAlert} />
      <Text accessibilityRole="alert" style={[styles.title, { color: theme.colors.text }]}>
        {messageFor(error)}
      </Text>

      {canRetry && onRetry ? (
        <View style={styles.action}>
          <OutlineButton label="Reintentar" glyph={RefreshCw} onPress={onRetry} />
        </View>
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
  frame: {
    borderWidth: 1,
    paddingVertical: 34,
  },
  glyph: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3.4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 460,
  },
  action: {
    marginTop: 6.8,
    alignItems: 'center',
  },
});
