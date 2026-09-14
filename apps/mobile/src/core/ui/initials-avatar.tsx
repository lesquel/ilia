import { Platform, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * A letter on the brand square. Not a photo: we do not ask teachers for one.
 */
export function InitialsAvatar({
  initial,
  size = 28,
}: {
  initial: string;
  size?: number;
}) {
  const theme = useTheme();
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          backgroundColor: theme.colors.text,
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            color: '#ffffff',
            fontSize,
            lineHeight: size,
            width: size,
            ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  letter: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
