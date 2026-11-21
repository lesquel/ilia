import { Lock } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import {
  useChangePassword,
  useSession,
  useUpdateProfile,
} from '@/features/auth/application/use-auth';
import { SESSION_ROLE_LABELS } from '@/features/auth/domain/app-location';
import {
  FULL_NAME_MAX_LENGTH,
  cleanFullName,
  isFullNameChange,
  type User,
} from '@/features/auth/domain/entities';
import { AvatarPicker } from '@/features/auth/presentation/avatar-picker';

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
      return 'No pudimos conectarnos. Revisa tu conexión.';
    default:
      return 'No pudimos cambiar tu contraseña.';
  }
}

function profileMessageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos guardar tu nombre.';

  switch (error.code) {
    case 'invalid_full_name':
    case 'schema_error':
    case 'validation_error':
      return `Revisa tu nombre: no puede quedar vacío ni pasar de ${FULL_NAME_MAX_LENGTH} caracteres.`;
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión.';
    default:
      return 'No pudimos guardar tu nombre.';
  }
}

export function AccountScreen() {
  const theme = useTheme();
  const { user } = useSession();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">Tu cuenta</Text>

      {user ? <ProfileCard user={user} /> : null}
      <PasswordCard />

      {/* Stated rather than hidden: someone who cannot get in needs to know
          that today the answer is a person, not a link. */}
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        ¿Olvidaste tu contraseña y no puedes entrar? Todavía no hay recuperación por correo:
        escríbenos y la restablecemos.
      </Text>
    </ScrollView>
  );
}

function ProfileCard({ user }: { user: User }) {
  const theme = useTheme();
  const update = useUpdateProfile();

  const [draft, setDraft] = useState(user.fullName);

  const ready = isFullNameChange(draft, user.fullName) && !update.isPending;

  const edit = (value: string) => {
    setDraft(value);
    // The last result described the previous name, not the one being typed.
    if (update.isSuccess || update.isError) update.reset();
  };

  const submit = () => {
    const fullName = cleanFullName(draft);
    if (!ready || fullName === null) return;
    update.mutate({ fullName }, { onSuccess: (saved) => setDraft(saved.fullName) });
  };

  return (
    <Card>
      <View style={styles.identity}>
        <ProfileAvatar name={user.fullName} avatarKey={user.avatarKey} avatarUrl={user.avatarUrl} size={64} />
        <View style={styles.identityText}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {user.fullName}
          </Text>
          <Text style={[styles.email, { color: theme.colors.neutral[600] }]} numberOfLines={1}>
            {user.email}
          </Text>
          <View
            style={[
              styles.roleTag,
              { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.sm },
            ]}
          >
            <Text style={[styles.roleTagText, { color: theme.colors.accentRamp[800] }]}>
              {SESSION_ROLE_LABELS[user.role]}
            </Text>
          </View>
        </View>
      </View>

      <AvatarPicker user={user} />

      <View style={[styles.rule, { backgroundColor: theme.colors.divider }]} />

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Nombre y apellido</Text>
      <Field
        value={draft}
        onChangeText={edit}
        autoCapitalize="words"
        autoComplete="name"
        maxLength={FULL_NAME_MAX_LENGTH}
        onSubmitEditing={submit}
        returnKeyType="done"
        accessibilityLabel="Nombre y apellido"
      />

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Correo</Text>
      <View
        style={[
          styles.input,
          styles.readOnly,
          {
            backgroundColor: theme.colors.neutral[100],
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Icon glyph={Lock} size={16} color={theme.colors.neutral[600]} />
        <Text
          style={[styles.readOnlyText, { color: theme.colors.neutral[600] }]}
          numberOfLines={1}
          selectable
        >
          {user.email}
        </Text>
      </View>
      <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
        Todavía no se puede cambiar el correo: es con el que entras a tu cuenta.
      </Text>

      {update.isError ? (
        <Text
          style={[styles.error, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {profileMessageFor(update.error)}
        </Text>
      ) : null}

      {update.isSuccess ? (
        <Text style={[styles.ok, { color: theme.colors.accentAlt }]} accessibilityRole="alert">
          Listo. Guardamos tu nombre.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={submit}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.accentButton,
            borderRadius: theme.radius.md,
            opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {update.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonLabel}>Guardar cambios</Text>
        )}
      </Pressable>
    </Card>
  );
}

function PasswordCard() {
  const theme = useTheme();
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

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">Cambiar contraseña</Text>
      {/* Said plainly, because it is the reason someone is on this screen: they
          think another person knows their password. */}
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        Al cambiarla se cierran todas las demás sesiones. Si alguien más entró con tu cuenta,
        dejará de tener acceso. Esta pantalla sigue abierta.
      </Text>

      <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Contraseña actual</Text>
      <Field
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
          <Text style={[styles.toggle, { color: theme.colors.accentAlt }]}>
            {revealed ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
      </View>
      <Field
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
        <Text style={[styles.ok, { color: theme.colors.accentAlt }]} accessibilityRole="alert">
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
            backgroundColor: theme.colors.accentButton,
            borderRadius: theme.radius.md,
            opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {change.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonLabel}>Cambiar contraseña</Text>
        )}
      </Pressable>
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
        Platform.OS === 'web'
          ? ({ boxShadow: '0 10px 28px rgba(17, 17, 17, 0.06)' } as unknown as ViewStyle)
          : undefined,
      ]}
    >
      {children}
    </View>
  );
}

/** A text input whose border takes the accent while it holds the focus. */
function Field({ onFocus, onBlur, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: focused ? theme.colors.accent : theme.colors.divider,
          color: theme.colors.text,
          borderRadius: theme.radius.md,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 20.4, maxWidth: 640, width: '100%', alignSelf: 'center', gap: 20.4 },
  title: { fontSize: 30, fontWeight: '600' },
  card: { borderWidth: 1, padding: 20.4, gap: 3.4 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  identityText: { flex: 1, minWidth: 0, gap: 3.4, alignItems: 'flex-start' },
  name: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  email: { fontSize: 14, lineHeight: 20 },
  roleTag: { paddingHorizontal: 10.2, paddingVertical: 3.4, marginTop: 3.4 },
  roleTagText: { fontSize: 12, fontWeight: '600' },
  rule: { height: 1, marginTop: 17, marginBottom: 6.8 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
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
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  readOnlyText: { flex: 1, fontSize: 16 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 6.8 },
  error: { fontSize: 14, marginTop: 6.8 },
  ok: { fontSize: 14, marginTop: 6.8, fontWeight: '600' },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 13.6,
  },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
