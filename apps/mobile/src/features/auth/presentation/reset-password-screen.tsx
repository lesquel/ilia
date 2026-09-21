import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { breakpoint, useTheme } from '@/core/theme';
import { AuthShell } from '@/features/auth/presentation/auth-shell';
import { useConfirmPasswordReset } from '@/features/auth/application/use-auth';
import { safeDestination } from '@/features/auth/domain/entities';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Vuelve a intentarlo.';
  }

  switch (error.code) {
    case 'invalid_token':
      return 'El código no es válido o ya expiró. Pide uno nuevo a tu instructor.';
    case 'same_password':
      return 'La nueva contraseña debe ser distinta de la anterior.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
    default:
      return 'No pudimos restablecer la contraseña. Vuelve a intentarlo.';
  }
}

export function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirmReset = useConfirmPasswordReset();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const { next, token: tokenParam } = useLocalSearchParams<{ next?: string; token?: string }>();
  const destination = safeDestination(next) as Href;

  const [resetToken, setResetToken] = useState(typeof tokenParam === 'string' ? tokenParam : '');
  const [newPassword, setNewPassword] = useState('');

  const canSubmit =
    resetToken.trim().length >= 16 && newPassword.length >= 8 && !confirmReset.isPending;

  const submit = () => {
    if (!canSubmit) return;
    confirmReset.mutate(
      { resetToken: resetToken.trim(), newPassword },
      { onSuccess: () => router.replace(destination) },
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthShell>
        <ScrollView
          contentContainerStyle={[styles.scroll, isWide ? undefined : styles.scrollCompact]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Restablecer contraseña
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
              Pega el código que te entregó tu instructor y elige una contraseña nueva.
            </Text>

            <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Código</Text>
            <TextInput
              style={inputStyle}
              value={resetToken}
              onChangeText={setResetToken}
              placeholder="Código de recuperación"
              placeholderTextColor={theme.colors.neutral[500]}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Código de recuperación"
            />

            <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>
              Nueva contraseña
            </Text>
            <TextInput
              style={inputStyle}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={theme.colors.neutral[500]}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={submit}
              returnKeyType="go"
              accessibilityLabel="Nueva contraseña"
            />

            {confirmReset.isError ? (
              <Text
                style={[styles.error, { color: theme.colors.accentRamp[700] }]}
                accessibilityRole="alert"
              >
                {messageFor(confirmReset.error)}
              </Text>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.md,
                  opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {confirmReset.isPending ? (
                <ActivityIndicator color="#f2f2f3" />
              ) : (
                <Text style={styles.buttonLabel}>Guardar contraseña</Text>
              )}
            </Pressable>

            <Text style={[styles.footer, { color: theme.colors.neutral[600] }]}>
              ¿Aún no tienes código?{' '}
              <Link href="/forgot-password" style={{ color: theme.colors.accent }}>
                Solicitar recuperación
              </Link>
            </Text>
          </View>
        </ScrollView>
      </AuthShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollCompact: {
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 6.8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 27.2,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    marginBottom: 6.8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 16,
    marginBottom: 20.4,
  },
  error: {
    fontSize: 14,
    marginBottom: 13.6,
  },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: {
    color: '#f2f2f3',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20.4,
  },
});
