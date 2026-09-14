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
import { useLogin } from '@/features/auth/application/use-auth';
import { safeDestination } from '@/features/auth/domain/entities';

/** Wording the teacher reads, chosen here from the backend's stable error code. */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Vuelve a intentarlo.';
  }

  switch (error.code) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no son correctos.';
    case 'inactive_account':
      return 'Esta cuenta está deshabilitada. Escríbenos para reactivarla.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
    case 'unavailable':
      return 'El servicio no está disponible en este momento. Prueba en unos minutos.';
    default:
      return 'No pudimos iniciar sesión. Vuelve a intentarlo.';
  }
}

export function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const login = useLogin();
  // Where the person was heading before being asked to sign in.
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const { next } = useLocalSearchParams<{ next?: string }>();
  // Cast past expo-router's typed routes: the destination is a runtime value,
  // and `safeDestination` is what makes it safe — it only ever returns an
  // internal path.
  const destination = safeDestination(next) as Href;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending;

  const submit = () => {
    if (!canSubmit) return;
    login.mutate(
      { email: email.trim(), password },
      // Back to where they were going, not to a generic home page.
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Iniciar sesión</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Entra para continuar con tus cursos
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

          <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Contraseña</Text>
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.neutral[500]}
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={submit}
            returnKeyType="go"
            accessibilityLabel="Contraseña"
          />

          {login.isError ? (
            <Text
              style={[styles.error, { color: theme.colors.accentRamp[700] }]}
              accessibilityRole="alert"
            >
              {messageFor(login.error)}
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
            {login.isPending ? (
              <ActivityIndicator color="#f2f2f3" />
            ) : (
              <Text style={styles.buttonLabel}>Entrar</Text>
            )}
          </Pressable>

          <Text style={[styles.footer, { color: theme.colors.neutral[600] }]}>
            ¿Todavía no tienes cuenta?{' '}
            <Link
              href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
              style={{ color: theme.colors.accent }}
            >
              Crear cuenta
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
    gap: 0,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 6.8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 27.2,
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
