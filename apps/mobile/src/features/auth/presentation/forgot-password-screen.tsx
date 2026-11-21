import { Link, useRouter } from 'expo-router';
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
import { useRequestPasswordReset } from '@/features/auth/application/use-auth';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Vuelve a intentarlo.';
  }
  if (error.code === 'network_error') {
    return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No pudimos registrar tu solicitud. Vuelve a intentarlo.';
}

export function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const requestReset = useRequestPasswordReset();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = email.trim().length > 0 && !requestReset.isPending;

  const submit = () => {
    if (!canSubmit) return;
    requestReset.mutate(
      { email: email.trim() },
      {
        onSuccess: () => setSubmitted(true),
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
            <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">Olvidé mi contraseña</Text>

            {submitted ? (
              <>
                <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
                  Si tu cuenta existe, tu instructor o el equipo ILIA te entregarán un código de
                  recuperación en la charla. Cuando lo tengas, restablece tu contraseña aquí.
                </Text>
                <Pressable
                  onPress={() => router.push('/reset-password')}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.accentButton,
                      borderRadius: theme.radius.md,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.buttonLabel}>Ya tengo un código</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
                  Indica el correo con el que te registraste. Te diremos cómo obtener un código con
                  ayuda de tu instructor.
                </Text>

                <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Correo</Text>
                <TextInput
                  style={inputStyle}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="docente@colegio.edu"
                  placeholderTextColor={theme.colors.neutral[500]}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  accessibilityLabel="Correo electrónico"
                />

                {requestReset.isError ? (
                  <Text
                    style={[styles.error, { color: theme.colors.accentRamp[700] }]}
                    accessibilityRole="alert"
                  >
                    {messageFor(requestReset.error)}
                  </Text>
                ) : null}

                <Pressable
                  onPress={submit}
                  disabled={!canSubmit}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.accentButton,
                      borderRadius: theme.radius.md,
                      opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {requestReset.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonLabel}>Enviar solicitud</Text>
                  )}
                </Pressable>
              </>
            )}

            <Text style={[styles.footer, { color: theme.colors.neutral[600] }]}>
              <Link href="/login" style={{ color: theme.colors.accentAlt }}>
                Volver a iniciar sesión
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
    fontSize: 30,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20.4,
  },
});
