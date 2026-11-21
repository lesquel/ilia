import * as ImagePicker from 'expo-image-picker';
import { Check, ImagePlus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import { PROFILE_AVATAR_CHOICES, type User } from '@/features/auth/domain/entities';
import { useUpdateAvatar } from '@/features/auth/application/use-auth';
import { isSelectableAvatarPhoto } from '@/features/auth/domain/avatar-file';

function photoError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'network_error') return 'No pudimos conectarnos. Revisa tu conexión.';
    if (error.status === 413) return 'La foto supera el límite de 5 MiB.';
    if (error.status === 415 || error.status === 422) return 'Usa una foto JPEG, PNG o WebP de hasta 5 MiB.';
    if (error.status === 503) return 'La subida de fotos no está disponible ahora. Elige un avatar ilustrado.';
  }
  return 'No pudimos guardar esa imagen. Prueba otra vez.';
}

export function AvatarPicker({ user }: { user: User }) {
  const theme = useTheme();
  const update = useUpdateAvatar();
  const input = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'photo' | 'avatar' | 'remove'>('avatar');
  const selected = user.avatarKey ? `illustrated:${user.avatarKey}` : user.avatarUrl ? 'photo' : 'initials';

  const upload = (file: Blob, contentType: string) => {
    setLocalError(null);
    setLastAction('photo');
    update.mutate({ kind: 'photo', file, contentType });
  };

  const chooseWebPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) acceptPhoto(file, upload, setLocalError);
  };

  const chooseNativePhoto = async () => {
    setLocalError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const file = await response.blob();
      const contentType = asset.mimeType ?? file.type;
      if (!isSelectableAvatarPhoto(contentType, file.size)) {
        setLocalError('Usa una foto JPEG, PNG o WebP de hasta 5 MiB.');
        return;
      }
      upload(file, contentType);
    } catch {
      setLocalError('No pudimos abrir la galería o preparar la foto. Prueba otra vez.');
    }
  };

  const pickPhoto = () => {
    if (Platform.OS === 'web') input.current?.click();
    else void chooseNativePhoto();
  };

  const message = localError ?? (update.isError
    ? lastAction === 'photo' ? photoError(update.error) : 'No pudimos actualizar tu opción de perfil.'
    : update.isSuccess ? 'Guardamos tu opción de perfil.' : '');

  return (
    <View style={[styles.section, { borderColor: theme.colors.divider }]}>
      <Text style={[styles.heading, { color: theme.colors.text }]} accessibilityRole="header">
        Foto o avatar
      </Text>
      <Text style={[styles.help, { color: theme.colors.neutral[600] }]}>
        Elige una ilustración o una foto tuya. JPEG, PNG o WebP; máximo 5 MiB.
      </Text>

      <View style={styles.previewRow}>
        <ProfileAvatar name={user.fullName} avatarKey={user.avatarKey} avatarUrl={user.avatarUrl} size={56} />
        <Text style={[styles.previewName, { color: theme.colors.text }]}>{user.fullName}</Text>
      </View>

      {Platform.OS === 'web' ? (
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Seleccionar una foto de perfil"
          onChange={chooseWebPhoto}
          style={styles.hiddenInput as React.CSSProperties}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={update.isPending}
        onPress={pickPhoto}
        style={({ pressed }) => [
          styles.action,
          { borderColor: theme.colors.divider, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        {update.isPending ? <ActivityIndicator color={theme.colors.accent} /> : <Icon glyph={ImagePlus} color={theme.colors.accentAlt} />}
        <Text style={[styles.actionText, { color: theme.colors.text }]}>Elegir foto</Text>
      </Pressable>

      <Text style={[styles.subheading, { color: theme.colors.text }]}>Avatares ilustrados</Text>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Avatares ilustrados">
        {PROFILE_AVATAR_CHOICES.map((choice) => {
          const active = selected === `illustrated:${choice.key}`;
          return (
            <Pressable
              key={choice.key}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ checked: active, disabled: update.isPending }}
              disabled={update.isPending}
              onPress={() => {
                setLocalError(null);
                setLastAction('avatar');
                update.mutate({ kind: 'illustrated', key: choice.key });
              }}
              style={({ pressed }) => [
                styles.choice,
                {
                  minHeight: 72,
                  borderColor: active ? theme.colors.accent : theme.colors.divider,
                  backgroundColor: active ? theme.colors.accentRamp[100] : theme.colors.surface,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <ProfileAvatar name={choice.label} avatarKey={choice.key} avatarUrl={null} size={40} />
              <Text style={[styles.choiceText, { color: theme.colors.text }]}>{choice.label}</Text>
              {active ? <Icon glyph={Check} size={14} color={theme.colors.accentAlt} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={update.isPending || selected === 'initials'}
        onPress={() => {
          setLocalError(null);
          setLastAction('remove');
          update.mutate({ kind: 'remove' });
        }}
        style={({ pressed }) => [styles.remove, { opacity: selected === 'initials' || update.isPending ? 0.45 : pressed ? 0.75 : 1 }]}
      >
        <Icon glyph={Trash2} color={theme.colors.accentAlt} />
        <Text style={[styles.actionText, { color: theme.colors.accentAlt }]}>Quitar y mostrar iniciales</Text>
      </Pressable>

      {message ? (
        <Text
          accessibilityRole={localError || update.isError ? 'alert' : 'text'}
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: localError || update.isError ? theme.colors.accentRamp[700] : theme.colors.accentAlt }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function acceptPhoto(
  file: Blob,
  upload: (file: Blob, contentType: string) => void,
  setError: (message: string) => void,
) {
  if (!isSelectableAvatarPhoto(file.type, file.size)) {
    setError('Usa una foto JPEG, PNG o WebP de hasta 5 MiB.');
    return;
  }
  upload(file, file.type);
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingTop: 16, marginTop: 12, gap: 10 },
  heading: { fontSize: 17, fontWeight: '700' },
  help: { fontSize: 13, lineHeight: 19 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 3 },
  previewName: { fontSize: 15, fontWeight: '600' },
  hiddenInput: { display: 'none' },
  action: { minHeight: 48, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start' },
  actionText: { fontSize: 14, fontWeight: '600' },
  subheading: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { width: '22%', minWidth: 74, flexGrow: 1, borderWidth: 1, padding: 6, alignItems: 'center', justifyContent: 'center', gap: 3 },
  choiceText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  remove: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 4 },
  message: { fontSize: 13, lineHeight: 19 },
});
