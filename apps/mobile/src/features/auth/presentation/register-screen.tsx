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
import { useRegister } from '@/features/auth/application/use-auth';
import {
  FULL_NAME_MAX_LENGTH,
  REGISTRATION_PASSWORD_MAX_LENGTH,
  REGISTRATION_PASSWORD_MIN_LENGTH,
  isValidRegistrationName,
  isEmailFieldRejected,
  registrationPasswordRules,
  safeDestination,
} from '@/features/auth/domain/entities';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Vuelve a intentarlo.';
  }

  switch (error.code) {
    case 'email_already_registered':
      return 'Ya existe una cuenta con ese correo. Prueba iniciar sesión.';
    case 'schema_error':
      return isEmailFieldRejected(error.detail)
        ? 'Ese correo no es válido. Usa un correo real.'
        : 'Revisa el nombre y la contraseña según los requisitos indicados.';
    case 'validation_error':
      return 'Revisa los datos: completa el nombre, usa un correo válido y cumple los requisitos de contraseña.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
    case 'unavailable':
      return 'El servicio no está disponible en este momento. Prueba en unos minutos.';
    default:
      return 'No pudimos crear tu cuenta. Vuelve a intentarlo.';
  }
}

export function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const register = useRegister();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const { next } = useLocalSearchParams<{ next?: string }>();
  // Cast past expo-router's typed routes: the destination is a runtime value,
  // and `safeDestination` is what makes it safe — it only ever returns an
  // internal path.
  const destination = safeDestination(next) as Href;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  // A reveal toggle instead of a "repeat your password" field. There is no
  // password-reset flow yet, so a typo here locks the account for good —
  // letting someone read what they typed catches that better than asking them
  // to type the same mistake twice.
  const [revealed, setRevealed] = useState(false);

  const nameOk = isValidRegistrationName(fullName);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordRules = registrationPasswordRules(password);
  const passwordLength = Array.from(password).length;
  const passwordRuleCount = Object.values(passwordRules).filter(Boolean).length;
  const passwordOk = passwordRuleCount === 5 && passwordLength <= REGISTRATION_PASSWORD_MAX_LENGTH;
  const passwordStrength = passwordLength === 0
    ? ''
    : passwordRuleCount <= 2
      ? 'Débil'
      : passwordRuleCount <= 4
        ? 'Media'
        : passwordLength >= 12
          ? 'Fuerte'
          : 'Buena';
  const canSubmit = nameOk && emailOk && passwordOk && !register.isPending;

  const submit = () => {
    if (!canSubmit) return;
    register.mutate(
      { fullName: fullName.trim(), email: email.trim(), password },
      // Straight into the product, and to wherever they were headed.
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
          <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">Crear cuenta</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Empieza a aprender inteligencia artificial haciendo
          </Text>

          <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Nombre y apellido</Text>
          <TextInput
            style={inputStyle}
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => setNameTouched(true)}
            placeholder="Ana Pérez"
            placeholderTextColor={theme.colors.neutral[500]}
            maxLength={FULL_NAME_MAX_LENGTH}
            autoComplete="name"
            accessibilityLabel="Nombre y apellido"
            accessibilityHint="Entre 2 y 120 caracteres: letras, espacios, guiones o apóstrofes."
          />
          {nameTouched && !nameOk ? (
            <Text style={[styles.fieldError, { color: theme.colors.accentRamp[700] }]}>
              Completa el nombre con al menos 2 caracteres. Usa letras, espacios, guiones o apóstrofes.
            </Text>
          ) : null}

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

          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Contraseña</Text>
            <Pressable accessibilityRole="button" onPress={() => setRevealed((on) => !on)}>
              <Text style={[styles.toggle, { color: theme.colors.accentAlt }]}>
                {revealed ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="Entre 8 y 128 caracteres"
            placeholderTextColor={theme.colors.neutral[500]}
            secureTextEntry={!revealed}
            maxLength={REGISTRATION_PASSWORD_MAX_LENGTH}
            autoCapitalize="none"
            autoComplete="new-password"
            onSubmitEditing={submit}
            returnKeyType="go"
            accessibilityLabel="Contraseña"
            accessibilityHint="Entre 8 y 128 caracteres, con mayúscula, minúscula, número y carácter especial."
          />

          <View style={styles.passwordFeedback} accessibilityLabel="Requisitos de contraseña">
            <View style={styles.meterHeader}>
              <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>Seguridad</Text>
              <Text style={[styles.meterLabel, { color: theme.colors.neutral[700] }]}>
                {passwordStrength || `Mínimo ${REGISTRATION_PASSWORD_MIN_LENGTH} caracteres`}
              </Text>
            </View>
            <View
              style={[styles.meterTrack, { backgroundColor: theme.colors.neutral[200] }]}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 5, now: passwordRuleCount }}
              accessibilityLabel={`Fortaleza de contraseña: ${passwordStrength || 'sin evaluar'}`}
            >
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${passwordRuleCount * 20}%`,
                    backgroundColor: passwordOk ? theme.colors.accent : theme.colors.accentRamp[400],
                  },
                ]}
              />
            </View>
            <View style={styles.ruleList}>
              {([
                ['longEnough', `Al menos ${REGISTRATION_PASSWORD_MIN_LENGTH} caracteres`],
                ['hasUppercase', 'Una letra mayúscula'],
                ['hasLowercase', 'Una letra minúscula'],
                ['hasNumber', 'Un número'],
                ['hasSpecial', 'Un carácter especial'],
              ] as const).map(([key, label]) => (
                <Text
                  key={key}
                  style={[
                    styles.rule,
                    { color: passwordRules[key] ? theme.colors.accentRamp[700] : theme.colors.neutral[600] },
                  ]}
                >
                  {passwordRules[key] ? '✓' : '○'} {label}
                </Text>
              ))}
            </View>
          </View>

          {register.isError ? (
            <Text
              style={[styles.error, { color: theme.colors.accentRamp[700] }]}
              accessibilityRole="alert"
            >
              {messageFor(register.error)}
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
            {register.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonLabel}>Crear cuenta</Text>
            )}
          </Pressable>

          <Text style={[styles.footer, { color: theme.colors.neutral[600] }]}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
              style={{ color: theme.colors.accentAlt }}
            >
              Iniciar sesión
            </Link>
            {' · '}
            <Link href="/forgot-password" style={{ color: theme.colors.accentAlt }}>
              Olvidé mi contraseña
            </Link>
          </Text>
        </View>
      </ScrollView>
      </AuthShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center' },
  scrollCompact: { justifyContent: 'flex-start', paddingTop: 8 },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '600', marginBottom: 6.8 },
  subtitle: { fontSize: 15, marginBottom: 27.2 },
  label: { fontSize: 13, marginBottom: 6.8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  toggle: { fontSize: 13, fontWeight: '600', marginBottom: 6.8 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 16,
    marginBottom: 20.4,
  },
  hint: { fontSize: 12, lineHeight: 18 },
  fieldError: { fontSize: 12, marginTop: -13.6, marginBottom: 13.6, lineHeight: 18 },
  passwordFeedback: { marginTop: -13.6, marginBottom: 20.4, gap: 6.8 },
  meterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meterLabel: { fontSize: 12, fontWeight: '600' },
  meterTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 3 },
  ruleList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
  rule: { fontSize: 12, lineHeight: 18 },
  error: { fontSize: 14, marginBottom: 13.6 },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  footer: { fontSize: 14, textAlign: 'center', marginTop: 20.4 },
});
