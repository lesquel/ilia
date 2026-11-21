import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
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
import { codeModuleUrl, officialCodeModule, signInToCodeModule } from '@/features/auth/data/code-module-access';
import { credentialsToSubmit, safeDestination } from '@/features/auth/domain/entities';

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
  const [revealed, setRevealed] = useState(false);

  const [moduleMode, setModuleMode] = useState(false);
  const [modulePending, setModulePending] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const moduleAvailable = Platform.OS === 'web' && Boolean(codeModuleUrl);
  const pending = login.isPending || modulePending;

  const [missing, setMissing] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // On the web a TextInput is an <input>; its value is what Chrome autofilled
  // even when React never heard about it.
  const fieldValue = (ref: typeof emailRef) =>
    Platform.OS === 'web'
      ? ((ref.current as unknown as { value?: string } | null)?.value ?? '')
      : '';

  const switchAccess = () => {
    setModuleMode((current) => !current);
    setEmail('');
    setPassword('');
    setRevealed(false);
    setMissing(false);
    setModuleError('');
    login.reset();
  };

  const submit = async () => {
    if (pending) return;
    const credentials = credentialsToSubmit(
      { email, password },
      { email: fieldValue(emailRef), password: fieldValue(passwordRef) },
    );
    setMissing(credentials === null);
    if (!credentials) return;
    if (moduleMode && codeModuleUrl) {
      setModuleError('');
      setModulePending(true);
      try {
        await signInToCodeModule(codeModuleUrl, credentials);
      } catch (error) {
        setModuleError(error instanceof Error && !(error instanceof TypeError)
          ? (error instanceof ApiError ? messageFor(error) : error.message)
          : 'No pudimos conectar con el módulo de código.');
        setModulePending(false);
      }
      return;
    }
    login.mutate(
      credentials,
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
          <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">Iniciar sesión</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            {moduleMode ? (officialCodeModule ? 'Usa tu cuenta oficial de ILIA' : 'Usa tu cuenta del módulo de código') : 'Entra para continuar con tus cursos'}
          </Text>

          <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Correo</Text>
          <TextInput
            style={inputStyle}
            key={moduleMode ? 'module-email' : 'ilia-email'}
            ref={emailRef}
            value={email}
            onChangeText={setEmail}
            placeholder="docente@colegio.edu"
            placeholderTextColor={theme.colors.neutral[500]}
            autoCapitalize="none"
            autoComplete={moduleMode ? 'off' : 'email'}
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel="Correo electrónico"
          />

          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Contraseña</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onPress={() => setRevealed((on) => !on)}
            >
              <Text style={[styles.toggle, { color: theme.colors.accentAlt }]}>
                {revealed ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={inputStyle}
            key={moduleMode ? 'module-password' : 'ilia-password'}
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.neutral[500]}
            secureTextEntry={!revealed}
            autoComplete={moduleMode ? 'off' : 'current-password'}
            onSubmitEditing={submit}
            returnKeyType="go"
            accessibilityLabel="Contraseña"
          />

          {!moduleMode && <Link
            href="/forgot-password"
            style={[styles.forgotLink, { color: theme.colors.accentAlt }]}
          >
            Olvidé mi contraseña
          </Link>}

          {missing ? (
            <Text
              style={[styles.error, { color: theme.colors.accentRamp[700] }]}
              accessibilityRole="alert"
            >
              Escribe tu correo y tu contraseña.
            </Text>
          ) : (moduleMode ? Boolean(moduleError) : login.isError) ? (
            <Text
              style={[styles.error, { color: theme.colors.accentRamp[700] }]}
              accessibilityRole="alert"
            >
              {moduleMode ? moduleError : messageFor(login.error)}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={pending}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.accentButton,
                borderRadius: theme.radius.md,
                opacity: pending ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {pending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonLabel}>{moduleMode ? 'Entrar al módulo' : 'Entrar'}</Text>
            )}
          </Pressable>

          {moduleAvailable && (
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={switchAccess}
              style={styles.switchAccess}
            >
              <Text style={[styles.toggle, { color: theme.colors.accentAlt }]}>
                {moduleMode ? 'Volver al acceso de ILIA' : 'Entrar al módulo de código'}
              </Text>
            </Pressable>
          )}

          {!moduleMode && <Text style={[styles.footer, { color: theme.colors.neutral[600] }]}>
            ¿Todavía no tienes cuenta?{' '}
            <Link
              href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
              style={{ color: theme.colors.accentAlt }}
            >
              Crear cuenta
            </Link>
          </Text>}
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  toggle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6.8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 16,
    marginBottom: 20.4,
  },
  forgotLink: {
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    alignSelf: 'flex-end',
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
  switchAccess: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 6,
  },
  footer: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20.4,
  },
});
