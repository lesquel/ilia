import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import {
  codeModuleUrl, officialCodeModule, openOfficialCodeModule,
} from '@/features/auth/data/code-module-access';

/** Independent entry, available after the normal platform login. */
export function CodeModuleButton() {
  const theme = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (Platform.OS !== 'web' || !officialCodeModule || !codeModuleUrl) return null;

  const enter = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await openOfficialCodeModule();
    } catch (cause) {
      setError(cause instanceof Error && !(cause instanceof TypeError)
        ? cause.message : 'No pudimos conectar con el módulo de código. Inténtalo nuevamente.');
      setPending(false);
    }
  };

  return (
    <View style={{ gap: 4, maxWidth: 260 }}>
      <Pressable onPress={enter} disabled={pending} accessibilityRole="button"
        style={{ paddingHorizontal: 12, paddingVertical: 8,
          borderRadius: theme.radius.sm, backgroundColor: theme.colors.accentButton,
          opacity: pending ? 0.6 : 1 }}>
        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>
          {pending ? 'Abriendo módulo…' : 'Entrar al módulo de código'}
        </Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.accentRamp[700], fontSize: 12 }}>
        {error}
      </Text> : null}
    </View>
  );
}
