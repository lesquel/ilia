import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { useChangePassword, useSession } from '@/features/auth/application/use-auth';

const MIN_PASSWORD = 8;

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos cambiar tu contraseña.';

  switch (error.code) {
    case 'invalid_credentials':
      return 'La contraseña actual no es correcta.';
    case 'same_password':
      return 'La contraseña nueva tiene que ser distinta de la actual.';
    case 'too_many_attempts':
      return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisá tu conexión.';
    default:
      return 'No pudimos cambiar tu contraseña.';
  }
}

export function AccountScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const change = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [revealed, setRevealed] = useState(false);

  const longEnough = next.length >= MIN_PASSWORD;
  const different = next !== current;
  const ready = current.length > 0 && longEnough && different && !change.isPending;

  const submit = () => {
    if (!ready) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.neutral[100],
      borderColor: theme.colors.divider,
      color: theme.colors.text,
      borderRadius: theme.radius.md,
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Tu cuenta</Text>
      {user ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
          {user.fullName} · {user.email}
        </Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cambiar contraseña</Text>
      {/* Said plainly, because it is the reason someone is on this screen: they
          think another person knows their password. */}
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        Al cambiarla se cierran todas las demás sesiones. Si alguien más entró con tu cuenta,
        dejará de tener acceso. Esta pantalla sigue abierta.
      </Text>

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Contraseña actual</Text>
      <TextInput
        style={inputStyle}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        accessibilityLabel="Contraseña actual"
      />

      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Contraseña nueva</Text>
        <Pressable accessibilityRole="button" onPress={() => setRevealed((on) => !on)}>
          <Text style={[styles.toggle, { color: theme.colors.accent }]}>
            {revealed ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
      </View>
      <TextInput
        style={inputStyle}
        value={next}
        onChangeText={setNext}
        secureTextEntry={!revealed}
        autoCapitalize="none"
        autoComplete="new-password"
        onSubmitEditing={submit}
        returnKeyType="go"
        accessibilityLabel="Contraseña nueva"
      />

      <Text
        style={[
          styles.hint,
          {
            color:
              next.length > 0 && !longEnough
                ? theme.colors.accentRamp[700]
                : theme.colors.neutral[600],
          },
        ]}
      >
        Mínimo {MIN_PASSWORD} caracteres. Una frase larga es más segura y más fácil de recordar que
        símbolos raros.
      </Text>

      {change.isError ? (
        <Text
          style={[styles.error, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {messageFor(change.error)}
        </Text>
      ) : null}

      {change.isSuccess ? (
        <Text style={[styles.ok, { color: theme.colors.accent }]} accessibilityRole="alert">
          Listo. Tu contraseña cambió y las demás sesiones se cerraron.
        </Text>
      ) : null}

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
        {change.isPending ? (
          <ActivityIndicator color="#f2f2f3" />
        ) : (
          <Text style={styles.buttonLabel}>Cambiar contraseña</Text>
        )}
      </Pressable>

      {/* Stated rather than hidden: someone who cannot get in needs to know
          that today the answer is a person, not a link. */}
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        ¿Olvidaste tu contraseña y no podés entrar? Todavía no hay recuperación por correo:
        escribinos y la restablecemos.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20.4, maxWidth: 480, width: '100%', alignSelf: 'center', gap: 3.4 },
  title: { fontSize: 30, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 20.4 },
  meta: { fontSize: 13, lineHeight: 20, marginBottom: 6.8 },
  label: { fontSize: 13, marginTop: 10.2, marginBottom: 3.4 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 10.2,
  },
  toggle: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, paddingHorizontal: 13.6, paddingVertical: 10.2, fontSize: 16 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 6.8 },
  error: { fontSize: 14, marginTop: 6.8 },
  ok: { fontSize: 14, marginTop: 6.8, fontWeight: '600' },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 13.6,
    marginBottom: 20.4,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 16, fontWeight: '600' },
});
