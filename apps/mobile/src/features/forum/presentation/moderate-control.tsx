import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useModerate } from '@/features/forum/application/use-forum';

const MAX_REASON = 500;

/**
 * Hide a thread or a reply (PRD 5.2, 5.3).
 *
 * Only rendered when the server says this reader may moderate this course —
 * `canModerate` travels on the thread, decided by the same rule the endpoint
 * enforces. Guessing from the role here would show the control to an instructor
 * looking at someone else's course, and the API would then refuse them.
 */
export function ModerateControl({
  slug,
  kind,
  id,
}: {
  slug: string;
  kind: 'thread' | 'post';
  id: string;
}) {
  const theme = useTheme();
  const moderate = useModerate(slug);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const ready = reason.trim().length > 0 && !moderate.isPending;

  const submit = () => {
    if (!ready) return;
    moderate.mutate(
      { kind, id, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('');
          setOpen(false);
        },
      },
    );
  };

  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text style={[styles.trigger, { color: theme.colors.neutral[600] }]}>
          {kind === 'thread' ? 'Retirar discusión' : 'Retirar respuesta'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.panel, { borderColor: theme.colors.divider, borderRadius: theme.radius.sm }]}>
      {/* The reason is required by the API and by decency: a message removed
          without one is indistinguishable from a message that vanished. */}
      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>
        ¿Por qué se retira? Queda registrado.
      </Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        maxLength={MAX_REASON}
        placeholder="Ej.: datos personales de estudiantes"
        placeholderTextColor={theme.colors.neutral[500]}
        accessibilityLabel="Motivo de la moderación"
        style={[
          styles.input,
          {
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.sm,
            color: theme.colors.text,
          },
        ]}
      />

      {moderate.isError ? (
        <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]} accessibilityRole="alert">
          No pudimos retirar el mensaje.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
          <Text style={[styles.trigger, { color: theme.colors.neutral[600] }]}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          onPress={submit}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accentButton,
              borderRadius: theme.radius.sm,
              opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {moderate.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonLabel}>Retirar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { fontSize: 12, fontWeight: '600' },
  panel: { borderWidth: 1, padding: 10.2, gap: 6.8, marginTop: 6.8 },
  label: { fontSize: 12 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 6.8, fontSize: 14 },
  error: { fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 13.6 },
  button: {
    paddingVertical: 6.8,
    paddingHorizontal: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  buttonLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
});
