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

import { INSTITUTE_FULL_NAME } from '@/core/brand';
import { ApiError } from '@/core/errors/api-error';
import { BrandMark } from '@/core/ui/brand-mark';
import { breakpoint, useTheme } from '@/core/theme';
import { useLogin } from '@/features/auth/application/use-auth';
import { safeDestination } from '@/features/auth/domain/entities';

/** Wording the teacher reads, chosen here from the backend's stable error code. */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Volvé a intentarlo.';
  }

  switch (error.code) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no son correctos.';
    case 'inactive_account':
      return 'Esta cuenta está deshabilitada. Escribinos para reactivarla.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';
    case 'unavailable':
      return 'El servicio no está disponible en este momento. Probá en unos minutos.';
    default:
      return 'No pudimos iniciar sesión. Volvé a intentarlo.';
  }
}

export function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const login = useLogin();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  // Where the person was heading before being asked to sign in.
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
      <ScrollView
        contentContainerStyle={[styles.scroll, isWide ? styles.scrollWide : undefined]}
        keyboardShouldPersistTaps="handled"
      >
        {isWide ? (
          <View style={styles.identityPane}>
            <BrandMark variant="lockup" height={240} />
            <Text style={styles.identityLine}>{INSTITUTE_FULL_NAME}</Text>
          </View>
        ) : null}

        <View style={[styles.formPane, isWide ? styles.formPaneWide : undefined]}>
        <View style={styles.card}>
          <Link href="/" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${INSTITUTE_FULL_NAME}, inicio`}
              style={styles.brandHit}
            >
              <BrandMark variant="monogram" height={40} />
            </Pressable>
          </Link>

          <Text style={[styles.title, { color: theme.colors.text }]}>Iniciar sesión</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Entrá para continuar con tus cursos
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
            ¿Todavía no tenés cuenta?{' '}
            <Link
              href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
              style={{ color: theme.colors.accent }}
            >
              Crear cuenta
            </Link>
          </Text>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20.4,
  },
  scrollWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 0,
  },
  identityPane: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40.8,
    gap: 20.4,
  },
  formPane: {
    width: '100%',
    justifyContent: 'center',
  },
  formPaneWide: {
    flex: 1,
    padding: 20.4,
  },
  identityLine: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 20.4,
    gap: 0,
  },
  brandHit: {
    alignSelf: 'flex-start',
    marginBottom: 27.2,
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
